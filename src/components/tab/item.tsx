import type { Component, JSX } from "solid-js";

const TabItem: Component<Props> = (props) => {
  return (
    <li
      class={`inline-flex items-center space-x-2 py-1 px-2 text-sm hover:bg-blue-50 ${
        props.class || ""
      }`}
      classList={{
        "text-primary": props.active || false,
      }}
    >
      {props.children}
    </li>
  );
};

export default TabItem;

interface Props extends JSX.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
}
