import {App, Editor, FileSystemAdapter, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, TFile, Workspace} from 'obsidian';
import * as path from 'path';

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
 * Render markdown to DOM, with some clean-up and embed images as data uris.
 */
class DocumentRenderer {
	private modal: CopyingToHtmlModal;

	// if true, render svg to bitmap
	private optionConvertSvgToBitmap: boolean = true;

	// only those which are different from image/${extension}
	private readonly mimeMap = new Map([
		['svg', 'image/svg+xml'],
		['jpg', 'image/jpeg'],
	]);

	private readonly imageExtensions = ['gif', 'png', 'jpg', 'jpeg', 'bmp', 'png', 'webp', 'tiff', 'svg'];

	private readonly vaultPath: string;
	private readonly vaultUriPrefix: string;

	constructor(private view: MarkdownView, private app: App) {
		this.vaultPath = (this.app.vault.getRoot().vault.adapter as FileSystemAdapter).getBasePath()
			.replace(/\\/g, '/');

		this.vaultUriPrefix = `app://local/${this.vaultPath}`;
	}

	/**
	 * Render document into detached HTMLElement
	 */
	public async renderDocument(): Promise<HTMLElement> {
		this.modal = new CopyingToHtmlModal(this.app);
		this.modal.open();

		try {
			// @ts-ignore
			// this.app.commands.executeCommandById('markdown:toggle-preview');
			const topNode = await this.renderMarkdown();
			return await this.transformHTML(topNode!);
		} finally {
			this.modal.close();

			// Return to edit view
			// @ts-ignore
			// this.app.commands.executeCommandById('markdown:toggle-preview');
		}
	}

	/**
	 * Render current view into HTMLElement, expanding embedded links
	 */
	private async renderMarkdown(): Promise<HTMLElement> {
		const inputFile = this.view.file.path;
		const markdown = this.view.data;
		const wrapper = document.createElement('div');
		wrapper.style.display = 'hidden';
		document.body.appendChild(wrapper);
		await MarkdownRenderer.renderMarkdown(markdown, wrapper, path.dirname(inputFile), this.view);

		await this.replaceEmbeds(wrapper);

		const result = wrapper.cloneNode(true) as HTMLElement;
		document.body.removeChild(wrapper);
		return result;
	}

	/**
	 * Replace span.internal-embed elements with the files / documents they link to. Images are not transformed
	 * into data uris at this stage.
	 */
	private async replaceEmbeds(rootNode: HTMLElement): Promise<void> {
		for (const node of Array.from(rootNode.querySelectorAll('.internal-embed'))) {
			const src = node.getAttr('src');
			const alt = node.getAttr('alt');

			if (src) {
				const extension = this.getExtension(src);
				if (extension === '' || extension === 'md') {
					// TODO: this is messy : I agree Oliver Balfour :D And it's not the only part
					const subfolder = src.substring(this.vaultPath.length);
					const file = this.app.metadataCache.getFirstLinkpathDest(src, subfolder);
					if (!file) {
						console.error("Could not load ${src}, not found in metadataCache");
					} else {
						const markdown = await this.app.vault.cachedRead(file);
						await MarkdownRenderer.renderMarkdown(markdown, node as HTMLElement, path.dirname(file.path), this.view)
					}
				} else if (this.imageExtensions.includes(extension)) {
					const subfolder = src.substring(this.vaultPath.length);
					const file = this.app.metadataCache.getFirstLinkpathDest(src, subfolder);
					if (!file) {
						console.error("Could not load image ${src}, not found in metadataCache");
					} else {
						const replacement = document.createElement('img');
						replacement.setAttribute('src', `${this.vaultUriPrefix}/${file.path}`);

						if (alt) {
							replacement.setAttribute('alt', alt);
						}

						node.replaceWith(replacement);
					}
				} else {
					// Not handling video, audio, ... on purpose
					node.remove();
				}
			} else {
				node.remove();
			}
		}
	}

	/**
	 * Transform rendered markdown to clean it up and embed images
	 */
	private async transformHTML(element: HTMLElement): Promise<HTMLElement> {
		// Remove styling which forces the preview to fill the window vertically
		// @ts-ignore
		const node: HTMLElement = element.cloneNode(true);
		node.style.paddingBottom = '0';
		node.style.minHeight = '0';

		this.removeCollapseIndicators(node);
		this.removeButtons(node);
		await this.embedImages(node);
		return node;
	}

	/** Remove the collapse indicators from HTML, not needed (and not working) in copy */
	private removeCollapseIndicators(node: HTMLElement) {
		node.querySelectorAll('.collapse-indicator')
			.forEach(node => node.remove());
	}

	/** Remove button elements (which appear after code blocks) */
	private removeButtons(node: HTMLElement) {
		node.querySelectorAll('button')
			.forEach(node => node.remove());
	}

	/** Replace all images sources with a data-uri */
	private async embedImages(node: HTMLElement): Promise<HTMLElement> {
		const promises: Promise<void>[] = [];

		// Replace all image sources
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
		const imageSourcePath = decodeURI(image.src);

		if (imageSourcePath.startsWith(this.vaultUriPrefix)) {
			// Transform uri to Obsidian relative path
			let path = imageSourcePath.substring(this.vaultUriPrefix.length + 1)
				.replace(/[?#].*/, '');
			path = decodeURI(path);

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
					// leave error at `log` level (not `error`), since we leave an url that may be workable
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
	private async readFromVault(path: string, mimeType: string): Promise<string> {
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
	private guessMimeType(filePath: string): string {
		const extension = this.getExtension(filePath) || 'png';
		return this.mimeMap.get(extension) || `image/${extension}`;
	}

	private getExtension(filePath: string): string {
		let result = path.extname(filePath).toLowerCase();
		if (path) {
			// remove leading dot
			result = result.substring(1);
		}
		return result;
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

			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) {
					console.log('Nothing to copy: No active markdown view');
					return;
				}

				console.log(`Copying "${activeView.file.path}" to clipboard...`);
				const copier = new DocumentRenderer(activeView, this.app);

				try {
					const document = await copier.renderDocument();

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
			},
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
