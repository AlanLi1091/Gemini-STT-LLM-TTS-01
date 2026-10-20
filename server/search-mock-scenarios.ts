import { MockSearchAdapter } from './search-adapter';
import type { SearchMockScenario } from './search-config';

// Fixed local fixtures only. Never read files, resolve hosts or fetch result URLs.
const DEFAULT_SOURCES = [
  { title: '离线搜索说明', url: 'https://example.com/search', content: '这是本地固定资料，用于核对搜索来源展示与保存，不代表真实联网结果。' },
  { title: '来源回放说明', url: 'https://example.org/replay', content: '刷新页面与相同请求回放应恢复已经保存的正文和来源，不重复搜索。' },
  { title: '国际化域名示例', url: 'https://例子.测试/资料', content: '这是国际化域名夹具，页面与消息应展示由 URL 解析得到的真实域名。' },
];
const HOSTILE_SOURCES = [
  { title: '危险协议来源', url: 'javascript:alert(1)', content: '此条必须在服务端过滤，不应进入展示或保存。' },
  { title: '<script>alert(1)</script> [文字](链接)', url: 'https://example.com/hostile', content: '@everyone <@123456789012345678> `代码` ****' },
  { title: '超长链接来源', url: 'https://example.org/long/' + 'a'.repeat(1925), content: '链接本身通过服务端校验，Discord 消息超过长度上限时保留标题摘要并隐藏链接。' },
  { title: '恶意文本补充', url: 'https://example.net/plain', content: '<script>不可执行</script> [文字](链接) @everyone' },
];

/** Results retain the existing SearchSource contract and always pass normal filtering. */
export function createMockSearchAdapter(scenario: SearchMockScenario): MockSearchAdapter {
  switch (scenario) {
    case 'default': return new MockSearchAdapter(DEFAULT_SOURCES);
    case 'hostile': return new MockSearchAdapter(HOSTILE_SOURCES);
    case 'empty': return new MockSearchAdapter([]);
    case 'fail': return new MockSearchAdapter([], { fail: true });
    case 'slow': return new MockSearchAdapter(DEFAULT_SOURCES, { delayMs: 3000 });
  }
}
