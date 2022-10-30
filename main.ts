import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';

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

/**
 * Modify document preview HTML to embed pictures and do some cleanup for pasting.
 */
class HTMLConverter {
	private modal: CopyingToHtmlModal;

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
		const MAX_TRIALS = 20 * 10;
		for (let trial = 0; trial < MAX_TRIALS; ++trial) {
			const pusher = topNode.querySelector('.markdown-preview-pusher');
			if (pusher !== null) {
				// work-around - see fixme above
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

		this.removeIndicators(node);

		await this.embedImages(node);

		return node;
	}

	/** Remove the collapse indicators from HTML, not needed (and not working) in copy */
	private removeIndicators(node: HTMLElement) {
		node.querySelectorAll('.collapse-indicator')
			.forEach(node => node.remove());
	}

	/** Replace all images sources with a data-uri */
	private async embedImages(node: HTMLElement): Promise<HTMLElement> {
		const promises: Promise<void>[] = [];

		node.querySelectorAll('img')
			.forEach(img => {
				console.log('data', img.src);
				if (img.src && !img.src.startsWith('data:')) {
					promises.push(this.replaceImageSource(img));
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
		image.src = await this.imageToDataUri(image.src);
	}

	/**
	 * Draw image url to canvas and return as data uri containing image pixel data
	 */
	private async imageToDataUri(url: string): Promise<string> {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const base_image = new Image();
		base_image.setAttribute('crossOrigin', 'anonymous');

		const dataUriPromise = new Promise<string>((resolve, reject) => {
			base_image.onload = () => {
				// TODO: resize image
				canvas.width = base_image.naturalWidth;
				canvas.height = base_image.naturalHeight;

				ctx!.drawImage(base_image, 0, 0);

				try {
					const uri = canvas.toDataURL('image/png');
					resolve(uri);
				} catch (err) {
					console.log(`failed ${url}`, err);
					// if we fail, leave the original url
					// images from plantuml.com cannot be loaded this way (tainted), but could still be accessed
					// from outside
					resolve(url);
				}

				canvas.remove();
			}
		})

		base_image.src = url;
		return dataUriPromise;
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
