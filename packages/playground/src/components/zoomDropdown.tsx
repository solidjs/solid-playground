import { Icon } from "solid-heroicons";
import { magnifyingGlassPlus } from "solid-heroicons/outline";
import Dismiss from "solid-dismiss";
import { Component, createSignal, createEffect } from "solid-js";
import { useZoom } from "solid-repl/src/hooks/useZoom";

export const ZoomDropdown: Component<{ showMenu: boolean }> = (props) => {
	const [open, setOpen] = createSignal(false);
	const { zoomState, updateZoom, setZoomState } = useZoom();
	const popupDuration = 1250;
	let containerEl!: HTMLDivElement;
	let prevZoom = zoomState.zoom;
	let timeoutId: number | null = null;
	let btnEl!: HTMLButtonElement;
	let prevFocusedEl: HTMLElement | null;
	let stealFocus = true;

	const onMouseMove = () => {
		stealFocus = true;
		window.clearTimeout(timeoutId!);
	};

	const onKeyDownContainer = (e: KeyboardEvent) => {
		if (!open()) return;

		if (e.key === "Escape" && !stealFocus) {
			if (prevFocusedEl) {
				setOpen(false);
				prevFocusedEl.focus();
				stealFocus = true;
			}
			window.clearTimeout(timeoutId!);
		}

		if (!["Tab", "Enter", "Space"].includes(e.key)) return;
		stealFocus = false;
		prevFocusedEl = null;
		window.clearTimeout(timeoutId!);
	};

	createEffect(() => {
		if (prevZoom === zoomState.zoom) return;
		prevZoom = zoomState.zoom;

		if (stealFocus) {
			prevFocusedEl = document.activeElement as HTMLElement;
			btnEl.focus();
			stealFocus = false;
		}

		setOpen(true);

		window.clearTimeout(timeoutId!);

		timeoutId = window.setTimeout(() => {
			setOpen(false);

			stealFocus = true;
			if (prevFocusedEl) {
				prevFocusedEl.focus();
			}
		}, popupDuration);
	});

	createEffect(() => {
		if (!open()) {
			if (containerEl) {
				containerEl.removeEventListener("mouseenter", onMouseMove);
			}
			stealFocus = true;
		} else {
			if (containerEl) {
				containerEl.addEventListener("mouseenter", onMouseMove, { once: true });
			}
		}
	});

	return (
		<div
			class="relative"
			onKeyDown={onKeyDownContainer}
			onClick={() => {
				window.clearTimeout(timeoutId!);
			}}
			ref={containerEl}
			tabindex="-1"
		>
			<button
				type="button"
				class="flex flex-row items-center space-x-2 rounded px-2 py-2 opacity-80 hover:opacity-100 md:px-1"
				classList={{
					"rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black":
						props.showMenu,
					"bg-gray-300 dark:text-black": open() && props.showMenu,
				}}
				title="Scale editor to make text larger or smaller"
				ref={btnEl}
			>
				<Icon class="h-6" path={magnifyingGlassPlus} />
				<span class="text-xs md:sr-only">Scale Editor</span>
			</button>
			<Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
				<div
					class="dark:bg-solid-darkbg absolute z-10 w-min rounded border-2 border-slate-200 bg-white p-6 shadow-md dark:border-neutral-800"
					classList={{
						"left-1/4": props.showMenu,
					}}
					style={{
						transform: "translateX(calc(2rem - 100%))",
					}}
				>
					<div class="flex">
						<button
							class="border-1 rounded-l px-3 py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:border-gray-700 dark:hover:bg-neutral-700"
							aria-label="decrease font size"
							onClick={() => updateZoom("decrease")}
						>
							-
						</button>
						<div class="border-1 w-20 px-3 py-1 text-center text-sm uppercase tracking-wide dark:border-gray-700">
							{zoomState.zoom}%
						</div>
						<button
							class="border-1 mr-4 rounded-r px-3 py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:border-gray-700 dark:hover:bg-neutral-700"
							aria-label="increase font size"
							onClick={() => updateZoom("increase")}
						>
							+
						</button>
						<button
							class="border-1 rounded px-3  py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:border-gray-700 dark:hover:bg-neutral-700"
							aria-label="reset font size"
							onClick={() => updateZoom("reset")}
						>
							Reset
						</button>
					</div>
					<div class="mt-10">
						<label class="my-3 block cursor-pointer dark:text-white">
							<input
								type="checkbox"
								class="mr-4 cursor-pointer"
								checked={zoomState.overrideNative}
								onChange={(e) =>
									setZoomState("overrideNative", e.currentTarget.checked)
								}
							/>
							Override browser zoom keyboard shortcut
						</label>
						<label class="my-3 block cursor-pointer dark:text-white">
							<input
								type="checkbox"
								class="mr-4 cursor-pointer"
								checked={zoomState.scaleIframe}
								onChange={(e) =>
									setZoomState("scaleIframe", e.currentTarget.checked)
								}
							/>
							Scale iframe <strong>Result</strong>
						</label>
					</div>
				</div>
			</Dismiss>
		</div>
	);
};
