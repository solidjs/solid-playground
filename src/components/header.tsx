import { Component } from "solid-js";

import logo from "url:../assets/images/logo.svg";
import pkg from "../../package.json";

export const Header: Component = () => {
  return (
    <header class="md:col-span-3 p-2 flex text-sm justify-between items-center bg-brand-default text-white">
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest">
        <a href="https://github.com/ryansolid/solid">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <span class="inline-block -mb-1">Solid Playground</span>
      </h1>

      <div class="flex items-center space-x-2">
        <span class="-mb-1 leading-0 text-white">
          v{pkg.dependencies["solid-js"].slice(1)}
        </span>
      </div>
    </header>
  );
};
