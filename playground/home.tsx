import { useRouteData } from 'solid-app-router';
import { Icon } from 'solid-heroicons';
import { eyeOff, plus, x } from 'solid-heroicons/outline';

export const Home = () => {
  const user = useRouteData();

  return (
    <div class="bg-brand-other h-full m-8">
      <button class="bg-solid-lightgray shadow-md dark:bg-solid-darkLighterBg rounded-xl p-4 text-3xl flex mx-auto">
        <Icon path={plus} class="w-8" /> Create new REPL
      </button>

      <table class="w-128 mx-auto my-8">
        <thead>
          <tr class="border-b border-neutral-600">
            <td>Title</td>
            <td>Edited</td>
            <td>Options</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>New Suspense Demo</td>
            <td>May 17, 2022</td>
            <td>
              <Icon path={eyeOff} class="w-6 inline m-2 ml-0" />
              <Icon path={x} class="w-6 inline m-2 mr-0 text-red-700" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
