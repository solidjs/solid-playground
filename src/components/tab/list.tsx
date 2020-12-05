import type { Component, JSX } from "solid-js";

const TabList: Component<JSX.HTMLAttributes<HTMLUListElement>> = (props) => {
  return (
    <ul
      class={`divide-x-2 divide-gray-400 flex items-center px-0 list-none bg-gray-50 m-0 overflow-auto ${
        props.class || ""
      }`}
    >
      {props.children}
    </ul>
  );
};

export default TabList;
