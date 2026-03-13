/**
 * Tasks API 测试脚本
 * 使用: node scripts/test-api.mjs
 * 可选: API_BASE=http://localhost:3001 node scripts/test-api.mjs
 */

const BASE = process.env.API_BASE || 'http://localhost:3001';
const API = `${BASE}/api/tasks`;

function log(name, ok, detail = '') {
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('\n=== Tasks API 测试 ===\n');
  let createdId = null;

  // 1. GET /api/tasks — 获取列表（初始可能为空）
  const getEmpty = await request('GET', API);
  log('GET /api/tasks', getEmpty.ok, `status=${getEmpty.status}`);
  if (!getEmpty.ok) {
    console.error('  response:', getEmpty.data);
    process.exit(1);
  }
  const isList = Array.isArray(getEmpty.data);
  log('  返回数组', isList, isList ? `共 ${getEmpty.data.length} 条` : '');

  // 2. POST /api/tasks — 创建任务
  const postBody = {
    title: '测试任务-' + Date.now(),
    description: '由 test-api 创建',
    status: 'pending',
  };
  const postRes = await request('POST', API, postBody);
  log('POST /api/tasks', postRes.ok, `status=${postRes.status}`);
  if (!postRes.ok) {
    console.error('  response:', postRes.data);
    process.exit(1);
  }
  if (postRes.data?.id) {
    createdId = postRes.data.id;
    log('  创建成功', true, `id=${createdId}`);
  } else {
    log('  返回包含 id', false);
    process.exit(1);
  }

  // 3. GET /api/tasks — 再次获取，应包含新任务
  const getAfter = await request('GET', API);
  log('GET /api/tasks（创建后）', getAfter.ok, `status=${getAfter.status}`);
  const found = Array.isArray(getAfter.data) && getAfter.data.some((t) => t.id === createdId);
  log('  列表中包含新任务', found);

  // 4. POST /api/tasks/breakdown — 拆解任务
  const breakdownRes = await request('POST', `${API}/breakdown`, { taskId: createdId });
  log('POST /api/tasks/breakdown', breakdownRes.ok, `status=${breakdownRes.status}`);
  if (!breakdownRes.ok) {
    console.error('  response:', breakdownRes.data);
  } else {
    const hasParent = breakdownRes.data?.parent?.id === createdId;
    const hasSubtasks = Array.isArray(breakdownRes.data?.subtasks) && breakdownRes.data.subtasks.length >= 1;
    const allHaveParentId = hasSubtasks && breakdownRes.data.subtasks.every((t) => t.parent_id === createdId);
    log('  返回原任务 parent', hasParent);
    log('  返回子任务列表', hasSubtasks, hasSubtasks ? `共 ${breakdownRes.data.subtasks.length} 条` : '');
    log('  子任务 parent_id 正确', allHaveParentId);
  }

  // 5. PATCH /api/tasks/[id] — 更新状态
  const patchRes = await request('PATCH', `${API}/${createdId}`, { status: 'completed' });
  log('PATCH /api/tasks/[id]', patchRes.ok, `status=${patchRes.status}`);
  if (!patchRes.ok) {
    console.error('  response:', patchRes.data);
  } else {
    log('  status 已更新', patchRes.data?.status === 'completed', `status=${patchRes.data?.status}`);
  }

  // 6. DELETE /api/tasks/[id] — 删除任务
  const delRes = await request('DELETE', `${API}/${createdId}`);
  log('DELETE /api/tasks/[id]', delRes.status === 204 || delRes.ok, `status=${delRes.status}`);

  // 7. GET 再次 — 确认已删除（可选：该任务不应再在列表）
  const getFinal = await request('GET', API);
  const stillThere = Array.isArray(getFinal.data) && getFinal.data.some((t) => t.id === createdId);
  log('删除后列表中无该任务', !stillThere);

  // 错误用例：POST 无 title
  const badPost = await request('POST', API, {});
  log('POST 无 title 返回 400', badPost.status === 400);

  // 错误用例：PATCH 无效 id（格式错误时 Supabase 可能返回 500）
  const badPatch = await request('PATCH', `${API}/invalid-uuid-xxx`, { status: 'completed' });
  log(
    'PATCH 无效 id 返回 4xx/5xx',
    badPatch.status >= 400 && badPatch.status < 600,
    `status=${badPatch.status}`
  );

  console.log('\n=== 测试完成 ===\n');
}

run().catch((err) => {
  console.error('运行失败:', err.message);
  process.exit(1);
});
