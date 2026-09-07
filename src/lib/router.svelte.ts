// Tiny history-based router. The app is a handful of views; state that
// should be shareable (explorer settings) lives in the query string.

export type Route = 'home' | 'explore' | 'missions' | 'people' | 'about' | 'women-in-space';

const PATHS: Record<Route, string> = {
  home: '/',
  explore: '/explore',
  missions: '/missions',
  people: '/people',
  about: '/about',
  // Story pages live at a plain slug each.
  'women-in-space': '/women-in-space',
};

function parse(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(PATHS) as Route[]).find((r) => PATHS[r] === p) ?? 'home';
}

class Router {
  route = $state<Route>(parse(location.pathname));
  query = $state<URLSearchParams>(new URLSearchParams(location.search));

  constructor() {
    window.addEventListener('popstate', () => this.sync());
  }
  private sync() {
    this.route = parse(location.pathname);
    this.query = new URLSearchParams(location.search);
  }
  href(route: Route, params?: Record<string, string>) {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return PATHS[route] + (qs ? `?${qs}` : '');
  }
  go(route: Route, params?: Record<string, string>) {
    history.pushState(null, '', this.href(route, params));
    this.sync();
    window.scrollTo({ top: 0 });
  }
  /** Update the query string in place without adding a history entry. */
  replaceQuery(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    history.replaceState(null, '', PATHS[this.route] + (qs ? `?${qs}` : ''));
    this.query = new URLSearchParams(qs);
  }
  /** Intercepts clicks on in-app links so they don't reload the page. */
  onclick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    history.pushState(null, '', url.pathname + url.search);
    this.sync();
    window.scrollTo({ top: 0 });
  };
}

export const router = new Router();
