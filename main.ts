import {App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, TFile} from 'obsidian';

/*
 * Generic lib functions
 */

/**
 * Like Promise.all(), but with a callback to indicate progress. Graciously lifted from
 * https://stackoverflow.com/a/42342373/1341132
 */
function allWithProgress(promises: Promise<any>[], callback: (percentCompleted: number) => void) {
	let count = 0;
	callback(0);
	for (const promise of promises) {
		promise.then(() => {
			count++;
			callback((count * 100) / promises.length);
		});
	}
	return Promise.all(promises);
}

/**
 * Do nothing for a while
 */
async function delay(milliseconds: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}


/*
 * Plugin code
 */

/**
 * Modify document preview HTML to embed pictures and do some cleanup for pasting.
 */
class HTMLConverter {
	private modal: CopyingToHtmlModal;

	// if true, render svg to bitmap
	private optionConvertSvgToBitmap: boolean = true;

	// only those which are different from image/${extension}
	private readonly mimeMap = new Map([
		['svg', 'image/svg+xml'],
		['jpg', 'image/jpeg'],
	]);

	constructor(private view: MarkdownView, private app: App) {
	}

	public async documentToHTML(): Promise<HTMLElement> {
		this.modal = new CopyingToHtmlModal(this.app);
		this.modal.open();

		try {
			// @ts-ignore
			this.app.commands.executeCommandById('markdown:toggle-preview');
			const topNode = await this.waitForPreviewToLoad();
			return await this.transformHTML(topNode!);
		} finally {
			this.modal.close();

			// Return to edit view
			// @ts-ignore
			this.app.commands.executeCommandById('markdown:toggle-preview');
		}
	}

	/**
	 * When we switch to preview mode it takes some time before the preview is rendered. Wait until it contains
	 * a known child node to ensure it is loaded
	 * FIXME: this is not robust, and we should wait for some event that indicates that preview has finished loading
	 * @private
	 * @returns a ready preview element
	 */
	private async waitForPreviewToLoad(): Promise<HTMLElement> {
		// @ts-ignore
		const topNode: HTMLElement = this.view.contentEl.querySelector('.markdown-reading-view .markdown-preview-section');

		// wait maximum 10s (at 20 tests per second) for the preview to be loaded
		const LOADING_POLL_DELAY = 50; // ms
		const MAX_ATTEMPTS = 10 * (1000 / LOADING_POLL_DELAY);
		for (let trial = 0; trial < MAX_ATTEMPTS; ++trial) {
			const pusher = topNode.querySelector('.markdown-preview-pusher');
			if (pusher !== null) {
				// work-around - see function comment above
				await delay(250);
				// found it -> the preview is loaded
				return topNode;
			}
			await delay(50);
		}

		throw Error('Preview could not be loaded');
	}

	/**
	 * Transform the preview to clean it up and embed images
	 */
	private async transformHTML(element: HTMLElement): Promise<HTMLElement> {
		// Remove styling which forces the preview to fill the window vertically
		// @ts-ignore
		const node: HTMLElement = element.cloneNode(true);
		node.style.paddingBottom = '0';
		node.style.minHeight = '0';

		this.removeCollapseIndicators(node);

		await this.embedImages(node);

		return node;
	}

	/** Remove the collapse indicators from HTML, not needed (and not working) in copy */
	private removeCollapseIndicators(node: HTMLElement) {
		node.querySelectorAll('.collapse-indicator')
			.forEach(node => node.remove());
	}

	/** Replace all images sources with a data-uri */
	private async embedImages(node: HTMLElement): Promise<HTMLElement> {
		const promises: Promise<void>[] = [];

		// Replace all image souces
		node.querySelectorAll('img')
			.forEach(img => {
				if (img.src) {
					if (img.src.startsWith('data:image/svg+xml') && this.optionConvertSvgToBitmap) {
						// image is an SVG, encoded as a data uri. This is the case with Excalidraw for instance
						// convert it to bitmap
						promises.push(this.replaceImageSource(img));
					} else if (!img.src.startsWith('data:')) {
						// render bitmaps, except if already as data-uri
						promises.push(this.replaceImageSource(img));
					}
				}
			});

		// @ts-ignore
		this.modal.progress.max = 100;

		// @ts-ignore
		await allWithProgress(promises, percentCompleted => this.modal.progress.value = percentCompleted);
		return node;
	}

	/** replace image src attribute with data uri */
	private async replaceImageSource(image: HTMLImageElement): Promise<void> {
		const vaultPath = (this.app.vault.getRoot().vault.adapter as FileSystemAdapter).getBasePath()
			.replace(/\\/g, '/');

		const vaultUriPrefix = `app://local/${vaultPath}`;

		if (image.src.startsWith(vaultUriPrefix)) {
			// Transform uri to Obsidian relative path
			let path = image.src.substring(vaultUriPrefix.length + 1)
				.replace(/[?#].*/, '');
			path = decodeURI(path);

			// console.log(`attempt direct fetch from vault ${path}`);

			const mimeType = this.guessMimeType(path);
			const data = await this.readFromVault(path, mimeType);

			// Leave choice here : return SVG or render as bitmap
			if (this.isSvg(mimeType) && this.optionConvertSvgToBitmap) {
				// render svg to bitmap for compatibility w/ for instance gmail
				image.src = await this.imageToDataUri(data);
			} else {
				// file content as base64 data uri (including svg)
				image.src = data;
			}
		} else {
			// Attempt to render uri to canvas. This is not an uri that points to the vault. Not needed for public
			// urls, but we may have un uri that points to our local machine or network, that will not be accessible
			// wherever we intend to paste the document.
			image.src = await this.imageToDataUri(image.src);
		}
	}

	/**
	 * Draw image url to canvas and return as data uri containing image pixel data
	 */
	private async imageToDataUri(url: string): Promise<string> {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const image = new Image();
		image.setAttribute('crossOrigin', 'anonymous');

		const dataUriPromise = new Promise<string>((resolve, reject) => {
			image.onload = () => {
				// TODO: resize image ?
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;

				ctx!.drawImage(image, 0, 0);

				try {
					const uri = canvas.toDataURL('image/png');
					resolve(uri);
				} catch (err) {
					console.log(`failed ${url}`, err);
					// if we fail, leave the original url.
					// This way images that we may not load from external sources (tainted) may still be accessed
					// (eg. plantuml)
					// TODO: attempt fallback with fetch ?
					resolve(url);
				}

				canvas.remove();
			}
		})

		image.src = url;

		return dataUriPromise;
	}

	/**
	 * Get binary data as b64 from a file in the vault
	 */
	private async readFromVault(path: string, mimeType: string) : Promise<string> {
		const tfile = this.app.vault.getAbstractFileByPath(path) as TFile;

		const data = await this.app.vault.readBinary(tfile);

		const blob = new Blob([data], {type: mimeType});
		const reader = new FileReader();
		const dataUriPromise = new Promise<string>((resolve, reject) => {
			reader.onload = (event) => {
				const base64: string = reader.result as string;
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});

		return await dataUriPromise;
	}

	/** Guess an image's mime-type based on its extension */
	private guessMimeType(path: string): string {
		const extensionMatch = /\.(.*?)$/.exec(path);
		const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'png';
		const mimeType = this.mimeMap.get(extension) || `image/${extension}`;
		return mimeType;
	}

	private isSvg(mimeType: string): boolean {
		return mimeType === 'image/svg+xml';
	}
}

export default class CopyAsHTMLPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'copy-as-html',
			name: 'Copy current document to clipboard',

			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const copier = new HTMLConverter(view, this.app);

				try {
					const document = await copier.documentToHTML();

					const data =
						new ClipboardItem({
							"text/html": new Blob([document.outerHTML], {
								// @ts-ignore
								type: ["text/html", 'text/plain']
							}),
							"text/plain": new Blob([document.outerHTML], {
								type: "text/plain"
							}),
						});

					await navigator.clipboard.write([data]);
					console.log('Copied document to clipboard');
					new Notice('document copied to clipboard')
				} catch (error) {
					new Notice(`copy failed: ${error}`);
					console.error('copy failed', error);
				}
			}
		});
	}
}

/**
 * Modal to show progress during conversion
 */
class CopyingToHtmlModal extends Modal {
	private _progress: HTMLElement;

	constructor(app: App) {
		super(app);
	}

	get progress() {
		return this._progress;
	}

	onOpen() {
		let {titleEl, contentEl} = this;
		titleEl.setText('Copying to clipboard');
		this._progress = contentEl.createEl('progress');
		this._progress.style.width = '100%';
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}
