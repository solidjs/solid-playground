import { Accessor, createContext, createSignal, ParentComponent, useContext } from 'solid-js';
import type { Tab } from 'solid-repl';
import { isDarkTheme } from './utils/isDarkTheme';

interface AppContextType {
  tabs: Accessor<Tab[] | undefined>;
  setTabs: (x: Accessor<Tab[] | undefined> | undefined) => void;
  dark: Accessor<boolean>;
  toggleDark: () => void;
}

const AppContext = createContext<AppContextType>();

// export const API = 'http://localhost:8787';
// export const API = '/api';
export const API = 'https://api.solidjs.com';

export const AppContextProvider: ParentComponent = (props) => {
  const [dark, setDark] = createSignal(isDarkTheme());
  document.body.classList.toggle('dark', dark());

  let [tabsGetter, setTabs] = createSignal<Accessor<Tab[] | undefined>>();
  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
