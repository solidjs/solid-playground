import { createContext, createEffect, createSignal, useContext, type Accessor, type ParentComponent } from 'solid-js';
import type { Tab } from 'solid-repl/src';
import { isDarkTheme } from './utils/isDarkTheme';

interface UserProfile {
  display: string;
  avatar: string;
}

interface AppContextType {
  token: string;
  user: Accessor<UserProfile>;
  profile: Accessor<string>;
  tabs: Accessor<Tab[] | undefined>;
  hasTabs: Accessor<boolean>;
  setTabs: (x: Accessor<Tab[] | undefined> | undefined) => void;
  solidVersion: Accessor<string | undefined>;
  setSolidVersion: (x: Accessor<string> | undefined) => void;
  dark: Accessor<boolean>;
  toggleDark: () => void;
}

const AppContext = createContext<AppContextType>();

// export const API = 'http://localhost:8787';
// export const API = '/api';
export const API = 'https://api.solidjs.com';

const anonymous: UserProfile = { display: '', avatar: '' };

const fetchProfile = async (token: string): Promise<UserProfile> => {
  try {
    const result = await fetch(`${API}/profile`, { headers: { authorization: `Bearer ${token}` } });
    const body = await result.json();
    return { display: body.display, avatar: body.avatar };
  } catch (e) {
    console.warn('[playground] failed to load profile', e);
    return anonymous;
  }
};

export const AppContextProvider: ParentComponent = (props) => {
  const [token, setToken] = createSignal(localStorage.getItem('token') || '');

  const [user, setUser] = createSignal<UserProfile>(anonymous);
  createEffect(token, (token) => {
    let current = true;
    if (!token) setUser(anonymous);
    else void fetchProfile(token).then((profile) => current && setUser(profile));
    return () => {
      current = false;
    };
  });

  const initialDark = isDarkTheme();
  const [dark, setDark] = createSignal(initialDark);
  document.body.classList.toggle('dark', initialDark);

  const [tabsGetter, setTabs] = createSignal<Accessor<Tab[] | undefined>>();
  const [versionGetter, setVersionGetter] = createSignal<Accessor<string>>();
  return (
    <AppContext
      value={{
        get token() {
          return token();
        },
        set token(x) {
          setToken(x);
          localStorage.setItem('token', x);
        },
        user,
        profile: () => user().display || 'anonymous',
        tabs() {
          const tabs = tabsGetter();
          if (!tabs) return undefined;
          return tabs();
        },
        hasTabs: () => !!tabsGetter(),
        setTabs(x) {
          setTabs(() => x);
        },
        solidVersion: () => versionGetter()?.(),
        setSolidVersion(x) {
          setVersionGetter(() => x);
        },
        dark,
        toggleDark() {
          const x = !dark();
          document.body.classList.toggle('dark', x);
          setDark(x);
          localStorage.setItem('dark', String(x));
        },
      }}
    >
      {props.children}
    </AppContext>
  );
};

export const useAppContext = () => useContext(AppContext);
