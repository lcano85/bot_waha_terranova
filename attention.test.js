const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createAttention } = require('./attention');
const fs = require('node:fs');
const vm = require('node:vm');

test('persists attention, automatically waits exactly 30 minutes from handoff and isolates clients', () => {
  const db = new DatabaseSync(':memory:');
  let time = 1000;
  let attention = createAttention(db, () => time);
  attention.start('a');
  time += 60000;
  attention = createAttention(db, () => time);
  assert.equal(attention.consume('a'), 'paused');
  assert.equal(attention.consume('b'), 'bot');
  const deadline = attention.get('a').resume_at;
  assert.equal(deadline, 1000 + 30 * 60 * 1000);
  time = deadline - 1;
  assert.equal(attention.get('a').resume_at, deadline);
  assert.equal(attention.consume('a'), 'paused');
  time = deadline;
  assert.equal(attention.consume('a'), 'resumed');
  assert.equal(attention.consume('a'), 'bot');
  db.close();
});

test('manual closure resumes immediately and survives restart without extending the deadline', () => {
  const db = new DatabaseSync(':memory:');
  let time = 1000;
  let attention = createAttention(db, () => time);
  attention.start('a');
  time += 60000;
  const closedAt = time;
  assert.equal(attention.finish('a').resume_at, closedAt);
  time += 1000;
  assert.equal(attention.finish('a').resume_at, closedAt);
  attention = createAttention(db, () => time);
  assert.equal(attention.get('a').resume_at, closedAt);
  assert.equal(attention.list()[0].status, 'ready');
  assert.equal(attention.consume('a'), 'resumed');
  db.close();
});

test('webhook silences every command during attention and resumes with menu', async () => {
  const db = new DatabaseSync(':memory:');
  let time = 1000;
  const attention = createAttention(db, () => time);
  const routes = {}, sent = [];
  const app = { use() {}, get() {}, put() {}, delete() {}, listen() {}, post(path, handler) { routes[path] = handler; } };
  const express = Object.assign(() => app, { json() {}, static() {} });
  const dependencies = {
    express, axios: { async post(url, body) { if (url.endsWith('/sendText')) sent.push(body); } },
    dotenv: { config() {} }, './db': { db, settings: () => ({ phone: '123' }) },
    './mail/alerts': { createAlerts: () => ({ start() {}, record() {} }) },
    './attention': { createAttention: () => attention }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./index'), 'utf8'), {
    require: name => dependencies[name], process: { env: { WAHA_SESSION: 'test' } }, console
  });
  const message = async (body, from = '123@c.us') => routes['/webhook/waha']({ body: {
    event: 'message', session: 'test', payload: { from, body }
  } }, { sendStatus() {} });
  await message('7');
  assert.equal(sent.length, 1);
  for (const body of ['hola', 'menu', 'ayuda', 'pedido', '2', '7', 'gracias', '']) await message(body);
  assert.equal(sent.length, 1);
  time = attention.get('123@c.us').resume_at - 1;
  await message('menu');
  assert.equal(sent.length, 1);
  time++;
  await message('2');
  assert.equal(sent.length, 2);
  assert.match(sent[1].text, /Tenemos estas opciones/);
  await message('pedido');
  await message('dos hamburguesas');
  assert.equal(attention.consume('123@c.us'), 'paused');
  const count = sent.length;
  await message('menu');
  assert.equal(sent.length, count);
  routes['/api/admin/attention/finish']({ body: { chatId: '123@c.us' } }, { json() {} });
  assert.equal(sent.length, count);
  await message('gracias');
  assert.equal(sent.length, count + 1);
  assert.match(sent.at(-1).text, /Tenemos estas opciones/);
  db.close();
});
