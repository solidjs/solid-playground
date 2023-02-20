import { Accessor, createContext, createResource, createSignal, ParentComponent, Resource, useContext } from 'solid-js';
import type { Tab } from 'solid-repl';
import { getDefaultOutput, setDefaultOutput, getStoreOutputTab, setStoreOutputTabLocal } from './utils/defaultTab';
import { isDarkTheme } from './utils/isDarkTheme';

interface AppContextType {
  token: string;
  user: Resource<{ display: string; avatar: string } | undefined>;
  tabs: Accessor<Tab[] | undefined>;
  setTabs: (x: Accessor<Tab[] | undefined> | undefined) => void;
  dark: Accessor<boolean>;
  toggleDark: () => void;
  outputTab: Accessor<number>;
  updateOutputTab: (x: number) => void;
  storeOutputTab: Accessor<boolean>;
  updateStoreOutputTab: (x: boolean) => void;
}

const AppContext = createContext<AppContextType>();

// export const API = 'http://localhost:8787';
// export const API = '/api';
export const API = 'https://api.solidjs.com';

export const AppContextProvider: ParentComponent = (props) => {
  const [token, setToken] = createSignal(localStorage.getItem('token') || '');
  const [user] = createResource(token, async (token) => {
    if (!token)
      return {
        display: '',
        avatar: '',
      };
    const result = await fetch(`${API}/profile`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const body = await result.json();
    return {
      display: body.display,
      avatar: body.avatar,
    };
  });

  const [dark, setDark] = createSignal(isDarkTheme());
  document.body.classList.toggle('dark', dark());

  let [tabsGetter, setTabs] = createSignal<Accessor<Tab[] | undefined>>();
  const [outputTab, setOutputTab] = createSignal(getDefaultOutput());
  const [storeOutputTab, setStoreOutputTab] = createSignal(getStoreOutputTab());
  return (
    <AppContext.Provider
      value={{
        get token() {
          return token();
        },
        set token(x) {
          setToken(x);
          localStorage.setItem('token', x);
        },
        user,
        tabs() {
          const tabs = tabsGetter();
          if (!tabs) return undefined;
          return tabs();
        },
        setTabs(x) {
          setTabs(() => x);
        },
        dark,
        toggleDark() {
          let x = !dark();
          document.body.classList.toggle('dark', x);
          setDark(x);
          localStorage.setItem('dark', String(x));
        },
        outputTab,
        updateOutputTab(x: number) {
          setOutputTab(x);
          setDefaultOutput(x);
        },
        storeOutputTab,
        updateStoreOutputTab(x: boolean) {
          setStoreOutputTab(x);
          setStoreOutputTabLocal(x);
          return;
        },
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
