(function () {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  }

  function buildNav(active, options = {}) {
    const user = getUser();
    const isAdmin = user.role === 'admin';
    const tenantNav = [
      { href: '/pages/home/index.html', label: '首页' },
      { href: '/pages/application/mine.html', label: '我的申请' },
      { href: '/pages/user/profile.html', label: '个人中心' }
    ];
    const adminNav = [
      { href: '/pages/home/index.html', label: '首页' },
      { href: '/pages/user/profile.html', label: '个人中心' },
      { href: '/pages/user/manage.html', label: '用户管理' },
      { href: '/pages/house/manage.html', label: '房源管理' },
      { href: '/pages/application/manage.html', label: '申请管理' },
      { href: '/pages/lease/records.html', label: '租赁记录' }
    ];
    const items = isAdmin ? adminNav : tenantNav;
    return `
      <a class="app-brand" href="/pages/home/index.html">房屋租赁管理系统</a>
      <div class="app-nav">
        ${items.map(item => `<a class="${active === item.label ? 'active' : ''}" href="${item.href}">${item.label}</a>`).join('')}
        <a href="/pages/auth/login.html" id="logoutLink">退出登录</a>
      </div>
      <div class="app-user">${user.username ? `当前用户：${user.real_name || user.username}（${isAdmin ? '管理员' : '租客'}）` : '游客模式'}</div>
    `;
  }

  window.AppNav = { buildNav, getUser };
})();
