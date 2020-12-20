import type { Component, JSX } from "solid-js";

export const TabItem: Component<Props> = (props) => {
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

interface Props extends JSX.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
}
