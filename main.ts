import {
	App,
	arrayBufferToBase64,
	FileSystemAdapter,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile
} from 'obsidian';

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
 * Static assets
 */

const DEFAULT_STYLESHEET =
	`body,input {
  font-family: "Roboto","Helvetica Neue",Helvetica,Arial,sans-serif
}

code, kbd, pre {
  font-family: "Roboto Mono", "Courier New", Courier, monospace;
  background-color: #f5f5f5;
}

pre {
  padding: 1em 0.5em;
}

table {
  background: white;
  border: 1px solid #666;
  border-collapse: collapse;
  padding: 0.5em;
}

table thead th,
table tfoot th {
  text-align: left;
  background-color: #eaeaea;
  color: black;
}

table th, table td {
  border: 1px solid #ddd;
  padding: 0.5em;
}

table td {
  color: #222222;
}

.callout[data-callout="abstract"] .callout-title,
.callout[data-callout="summary"] .callout-title,
.callout[data-callout="tldr"]  .callout-title,
.callout[data-callout="faq"] .callout-title,
.callout[data-callout="info"] .callout-title,
.callout[data-callout="help"] .callout-title {
  background-color: #828ee7;
}
.callout[data-callout="tip"] .callout-title,
.callout[data-callout="hint"] .callout-title,
.callout[data-callout="important"] .callout-title {
  background-color: #34bbe6;
}
.callout[data-callout="success"] .callout-title,
.callout[data-callout="check"] .callout-title,
.callout[data-callout="done"] .callout-title {
  background-color: #a3e048;
}
.callout[data-callout="question"] .callout-title,
.callout[data-callout="todo"] .callout-title {
  background-color: #49da9a;
}
.callout[data-callout="caution"] .callout-title,
.callout[data-callout="attention"] .callout-title {
  background-color: #f7d038;
}
.callout[data-callout="warning"] .callout-title,
.callout[data-callout="missing"] .callout-title,
.callout[data-callout="bug"] .callout-title {
  background-color: #eb7532;
}
.callout[data-callout="failure"] .callout-title,
.callout[data-callout="fail"] .callout-title,
.callout[data-callout="danger"] .callout-title,
.callout[data-callout="error"] .callout-title {
  background-color: #e6261f;
}
.callout[data-callout="example"] .callout-title {
  background-color: #d23be7;
}
.callout[data-callout="quote"] .callout-title,
.callout[data-callout="cite"] .callout-title {
  background-color: #aaaaaa;
}

.callout-icon {
  flex: 0 0 auto;
  display: flex;
  align-self: center;
}

svg.svg-icon {
  height: 18px;
  width: 18px;
  stroke-width: 1.75px;
}

.callout {
  overflow: hidden;
  margin: 1em 0;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.callout-title {
  padding: .5em;
  display: flex;
  gap: 8px;
  font-size: inherit;
  color: black;
  line-height: 1.3em;
}

.callout-title-inner {
  font-weight: bold;
  color: black;
}

.callout-content {
  overflow-x: auto;
  padding: 0.25em .5em;
  color: #222222;
  background-color: white !important;
}

ul.contains-task-list {
  padding-left: 0;
  list-style: none;
}

ul.contains-task-list ul.contains-task-list {
  padding-left: 2em;
}

ul.contains-task-list li input[type="checkbox"] {
  margin-right: .5em;
}

.callout-table,
.callout-table tr,
.callout-table p {
  width: 100%;
  padding: 0;
}

.callout-table td {
  width: 100%;
  padding: 0 1em;
}

.callout-table p {
  padding-bottom: 0.5em;
}

.source-table {
  width: 100%;
  background-color: #f5f5f5;
}
`;

// Thank you again Olivier Balfour !
const MERMAID_STYLESHEET = `
:root {
  --default-font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
  --font-monospace: 'Source Code Pro', monospace;
  --background-primary: #ffffff;
  --background-modifier-border: #ddd;
  --text-accent: #705dcf;
  --text-accent-hover: #7a6ae6;
  --text-normal: #2e3338;
  --background-secondary: #f2f3f5;
  --background-secondary-alt: #e3e5e8;
  --text-muted: #888888;
  --font-mermaid: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
  --text-error: #E4374B;
  --background-primary-alt: '#fafafa';
  --background-accent: '';
  --interactive-accent: hsl( 254,  80%, calc( 68% + 2.5%));
  --background-modifier-error: #E4374B;
}
`;

const htmlTemplate = (stylesheet: string, body: string, title: string) => `<html>
<head>
  <title>${title}</title>
  <style>
    ${MERMAID_STYLESHEET}
    ${stylesheet}
  </style>
</head>
<body>
${body}
</body>
</html>`;

/*
 * Plugin code
 */

/** Don't allow multiple copy processes to run at the same time */
let copyIsRunning = false;

/** true while a block is being processed by MarkDownPostProcessor instances */
let ppIsProcessing = false;

/** moment at which the last block finished post-processing */
let ppLastBlockDate = Date.now();


/**
 * Options for DocumentRenderer
 */
type DocumentRendererOptions = {
	convertSvgToBitmap: boolean,
	removeFrontMatter: boolean,
	formatAsTables: boolean,
	embedExternalLinks: boolean,
	removeDataviewMetadataLines: boolean,
};

const documentRendererDefaults = {
	convertSvgToBitmap: true,
	removeFrontMatter: true,
	formatAsTables: false,
	embedExternalLinks: false,
	removeDataviewMetadataLines: false
};

/**
 * Render markdown to DOM, with some clean-up and embed images as data uris.
 */
class DocumentRenderer {
	private modal: CopyingToHtmlModal;

	// time required after last block was rendered before we decide that rendering a view is completed
	private optionRenderSettlingDelay: number = 100;

	// only those which are different from image/${extension}
	private readonly mimeMap = new Map([
		['svg', 'image/svg+xml'],
		['jpg', 'image/jpeg'],
	]);

	private readonly imageExtensions = ['gif', 'png', 'jpg', 'jpeg', 'bmp', 'png', 'webp', 'tiff', 'svg'];

	private readonly externalSchemes = ['http', 'https'];

	private readonly vaultPath: string;
	private readonly vaultUriPrefix: string;

	constructor(private view: MarkdownView, private app: App,
				private options: DocumentRendererOptions = documentRendererDefaults)
	{
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
			const topNode = await this.renderMarkdown();
			return await this.transformHTML(topNode!);
		} finally {
			this.modal.close();
		}
	}

	/**
	 * Render current view into HTMLElement, expanding embedded links
	 */
	private async renderMarkdown(): Promise<HTMLElement> {
		const inputFile = this.view.file;
		const markdown = this.view.data;

		const processedMarkdown = this.preprocessMarkdown(markdown);

		const wrapper = document.createElement('div');
		wrapper.style.display = 'hidden';
		document.body.appendChild(wrapper);
		await MarkdownRenderer.renderMarkdown(processedMarkdown, wrapper, inputFile.path, this.view);
		await this.untilRendered();

		await this.replaceEmbeds(wrapper);

		const result = wrapper.cloneNode(true) as HTMLElement;
		document.body.removeChild(wrapper);
		return result;
	}

	private preprocessMarkdown(markdown: string): string {
		let processed = markdown;

		if (this.options.removeFrontMatter) {
			processed = processed.replace(/^[^ \t:#`<>][^:#`<>]+::.*$/gm, '');
		}

		return processed;
	}

	/**
	 * Wait until the view has finished rendering
	 *
	 * Beware, this is a dirty hack...
	 *
	 * We have no reliable way to know if the document finished rendering. For instance dataviews or task blocks
	 * may not have been post processed.
	 * MarkdownPostProcessors are called on all the "blocks" in the HTML view. So we register one post-processor
	 * with high-priority (low-number to mark the block as being processed, and another one with low-priority that
	 * runs after all other post-processors).
	 * Now if we see that no blocks are being post-processed, it can mean 2 things :
	 *  - either we are between blocks
	 *  - or we finished rendering the view
	 * On the premise that the time that elapses between the post-processing of consecutive blocks is always very
	 * short (just iteration, no work is done), we conclude that the render is finished if no block has been
	 * rendered for enough time.
	 */
	private async untilRendered() {
		while (ppIsProcessing || Date.now() - ppLastBlockDate < this.optionRenderSettlingDelay) {
			if (ppLastBlockDate === 0) {
				break;
			}
			await delay(20);
		}
	}

	/**
	 * Replace span.internal-embed elements with the files / documents they link to. Images are not transformed
	 * into data uris at this stage.
	 */
	private async replaceEmbeds(rootNode: HTMLElement): Promise<void> {
		for (const node of Array.from(rootNode.querySelectorAll('.internal-embed'))) {
			const src = node.getAttr('src');
			const alt = node.getAttr('alt');

			if (!src) {
				node.remove();
				continue;
			}

			const extension = this.getExtension(src);
			if (extension === '' || extension === 'md') {
				const file = this.getEmbeddedFile(src);
				if (file) {
					// Not recursively rendering the embedded elements here. If someone turns up with a need for
					// this it should be easy to adapt this.
					const markdown = await this.app.vault.cachedRead(file);
					await MarkdownRenderer.renderMarkdown(markdown, node as HTMLElement, file.path, this.view)
				}
			} else if (this.imageExtensions.includes(extension)) {
				const file = this.getEmbeddedFile(src);
				if (file) {
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
		}
	}

	/**
	 * Get a TFile from its `src` attribute of a `.linked-embed`, or undefined if not found or not a file.
	 */
	private getEmbeddedFile(src: string): TFile | undefined {
		// TODO: this is messy : I agree Oliver Balfour :D
		const subfolder = src.substring(this.vaultPath.length);
		const file = this.app.metadataCache.getFirstLinkpathDest(src, subfolder);
		if (!file) {
			console.error(`Could not load ${src}, not found in metadataCache`);
			return undefined;
		}

		if (!(file instanceof TFile)) {
			console.error(`Embedded element '${src}' is not a file`);
			return undefined;
		}

		return file as TFile;
	}

	/**
	 * Transform rendered markdown to clean it up and embed images
	 */
	private async transformHTML(element: HTMLElement): Promise<HTMLElement> {
		// Remove styling which forces the preview to fill the window vertically
		// @ts-ignore
		const node: HTMLElement = element.cloneNode(true);
		node.removeAttribute('style');

		if (this.options.removeFrontMatter) {
			this.removeFrontMatter(node);
		}

		this.replaceInternalLinks(node);
		this.makeCheckboxesReadOnly(node);
		this.removeCollapseIndicators(node);
		this.removeButtons(node);

		if (this.options.formatAsTables) {
			this.transformCodeToTables(node);
			this.transformCalloutsToTables(node);
		}

		await this.embedImages(node);
		await this.renderSvg(node);
		return node;
	}

	/** Remove front-matter */
	private removeFrontMatter(node: HTMLElement) {
		node.querySelectorAll('.frontmatter, .frontmatter-container')
			.forEach(node => node.remove());
	}

	private replaceInternalLinks(node: HTMLElement) {
		node.querySelectorAll('a.internal-link')
			.forEach(node => {
				console.log(node.getText());
				const textNode = node.parentNode!.createEl('span');
				textNode.innerText = node.getText();
				textNode.className = 'internal-link';
				node.parentNode!.replaceChild(textNode, node);
				console.log(`replacing with`, textNode)
			});
	}

	private makeCheckboxesReadOnly(node: HTMLElement) {
		node.querySelectorAll('input[type="checkbox"]')
			.forEach(node => node.setAttribute('disabled', 'disabled'));
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

	/** Transform code blocks to tables */
	private transformCodeToTables(node: HTMLElement) {
		node.querySelectorAll('pre')
			.forEach(node => {
				const codeEl = node.querySelector('code');
				if (codeEl) {
					const code = codeEl.innerHTML.replace(/\n*$/, '');
					const table = node.parentElement!.createEl('table');
					table.className = 'source-table';
					table.innerHTML = `<tr><td><pre>${code}</pre></td></tr>`;
					node.parentElement!.replaceChild(table, node);
				}
			});
	}

	/** Transform callouts to tables */
	private transformCalloutsToTables(node: HTMLElement) {
		node.querySelectorAll('.callout')
			.forEach(node => {
				const callout = node.parentElement!.createEl('table');
				callout.addClass('callout-table', 'callout');
				callout.setAttribute('data-callout', node.getAttribute('data-callout') ?? 'quote');
				const headRow = callout.createEl('tr');
				const headColumn = headRow.createEl('td');
				headColumn.addClass('callout-title');
				// const img = node.querySelector('svg');
				const title = node.querySelector('.callout-title-inner');

				// if (img) {
				// 	headColumn.appendChild(img);
				// }

				if (title) {
					const span = headColumn.createEl('span');
					span.innerHTML = title.innerHTML;
				}

				const originalContent = node.querySelector('.callout-content');
				if (originalContent) {
					const row = callout.createEl('tr');
					const column = row.createEl('td');
					column.innerHTML = originalContent.innerHTML;
				}

				node.remove()
			});
	}

	/** Replace all images sources with a data-uri */
	private async embedImages(node: HTMLElement): Promise<HTMLElement> {
		const promises: Promise<void>[] = [];

		// Replace all image sources
		node.querySelectorAll('img')
			.forEach(img => {
				if (img.src) {
					if (img.src.startsWith('data:image/svg+xml') && this.options.convertSvgToBitmap) {
						// image is an SVG, encoded as a data uri. This is the case with Excalidraw for instance.
						// Convert it to bitmap
						promises.push(this.replaceImageSource(img));
						return;
					}

					if (!this.options.embedExternalLinks) {
						const [scheme] = img.src.split(':', 1);
						if (this.externalSchemes.includes(scheme.toLowerCase())) {
							// don't touch external images
							return;
						}
						else {
							// not an external image, continue processing below
						}
					}

					if (!img.src.startsWith('data:')) {
						// render bitmaps, except if already as data-uri
						promises.push(this.replaceImageSource(img));
						return;
					}
				}
			});

		// @ts-ignore
		this.modal.progress.max = 100;

		// @ts-ignore
		await allWithProgress(promises, percentCompleted => this.modal.progress.value = percentCompleted);
		return node;
	}

	private async renderSvg(node: HTMLElement): Promise<Element> {
		const xmlSerializer = new XMLSerializer();

		if (!this.options.convertSvgToBitmap) {
			return node;
		}

		const promises: Promise<void>[] = [];

		const replaceSvg = async (svg: SVGSVGElement) => {
			let style: HTMLStyleElement = svg.querySelector('style') || svg.appendChild(document.createElement('style'));
			style.innerHTML += MERMAID_STYLESHEET;

			const svgAsString = xmlSerializer.serializeToString(svg);

			const svgData = `data:image/svg+xml;base64,` + Buffer.from(svgAsString).toString('base64');
			const dataUri = await this.imageToDataUri(svgData);

			const img = svg.createEl('img');
			img.style.cssText = svg.style.cssText;
			img.src = dataUri;

			svg.parentElement!.replaceChild(img, svg);
		};

		node.querySelectorAll('svg')
			.forEach(svg => {
				promises.push(replaceSvg(svg));
			});

		// @ts-ignore
		this.modal.progress.max = 0;

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

			if (this.isSvg(mimeType) && this.options.convertSvgToBitmap) {
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
					// TODO: should we attempt to fallback with fetch ?
					resolve(url);
				}

				canvas.remove();
			}

			image.onerror = (err) => {
				console.log('could not load data uri');
				// if we fail, leave the original url
				resolve(url);
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
		return `data:${mimeType};base64,` + arrayBufferToBase64(data);
	}

	/** Guess an image's mime-type based on its extension */
	private guessMimeType(filePath: string): string {
		const extension = this.getExtension(filePath) || 'png';
		return this.mimeMap.get(extension) || `image/${extension}`;
	}

	/** Get lower-case extension for a path */
	private getExtension(filePath: string): string {
		// avoid using the "path" library
		const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);
		return fileName.slice(fileName.lastIndexOf('.') + 1 || fileName.length)
			.toLowerCase();
	}

	private isSvg(mimeType: string): boolean {
		return mimeType === 'image/svg+xml';
	}
}

/**
 * Modal to show progress during conversion
 */
class CopyingToHtmlModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	private _progress: HTMLElement;

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

/**
 * Settings dialog
 */
class CopyDocumentAsHTMLSettingsTab extends PluginSettingTab {
	constructor(app: App, private plugin: CopyDocumentAsHTMLPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Copy document as HTML Settings'});

		containerEl.createEl('h3', {text: 'Compatibility'});

		new Setting(containerEl)
			.setName('Convert SVG files to bitmap')
			.setDesc('If checked, SVG files are converted to bitmap. This makes the copied documents heavier but improves compatibility (eg. with gmail).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.convertSvgToBitmap)
				.onChange(async (value) => {
					this.plugin.settings.convertSvgToBitmap = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Embed external images')
			.setDesc('If checked, external images are downloaded and embedded. If unchecked, the resulting document may contain links to external resources')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.embedExternalLinks)
				.onChange(async (value) => {
					this.plugin.settings.embedExternalLinks = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Render some elements as tables')
			.setDesc("If checked code blocks and callouts are rendered as tables, which makes pasting into Google docs somewhat prettier.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.formatAsTables)
				.onChange(async (value) => {
					this.plugin.settings.formatAsTables = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Rendering'});

		new Setting(containerEl)
			.setName('Remove front-matter sections')
			.setDesc("If checked, the YAML content between --- lines at the front of the document are removed. If you don't know what this means, leave it on.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeFrontMatter)
				.onChange(async (value) => {
					this.plugin.settings.removeFrontMatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remove dataview metadata lines')
			.setDesc("Remove lines that only contain dataview meta-data, eg. \"rating:: 9\". Metadata between square brackets is left intact. "
				+ "Current limitations are that lines starting with a space are not removed, and lines that look like metadata in code blocks are removed if they don't start with a space")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeDataviewMetadataLines)
				.onChange(async (value) => {
					this.plugin.settings.removeDataviewMetadataLines = value;
					await this.plugin.saveSettings();
				}));

		const useCustomStylesheetSetting = new Setting(containerEl)
			.setName('Provide a custom stylesheet')
			.setDesc('The default stylesheet provides minimalistic theming. You may want to customize it for better looks.');

		const customStylesheetSetting = new Setting(containerEl)
			.setName('Custom stylesheet')
			.setDesc('Disabling the setting above will replace the custom stylesheet with the default.')
			.setClass('custom-css-setting')
			.addTextArea(textArea => textArea
				.setValue(this.plugin.settings.styleSheet)
				.onChange(async (value) => {
					this.plugin.settings.styleSheet = value;
					await this.plugin.saveSettings();
				}));

		useCustomStylesheetSetting.addToggle(toggle => {
			customStylesheetSetting.settingEl.toggle(this.plugin.settings.useCustomStylesheet);

			toggle
				.setValue(this.plugin.settings.useCustomStylesheet)
				.onChange(async (value) => {
					this.plugin.settings.useCustomStylesheet = value;
					customStylesheetSetting.settingEl.toggle(this.plugin.settings.useCustomStylesheet);
					if (!value) {
						this.plugin.settings.styleSheet = DEFAULT_STYLESHEET;
					}
					await this.plugin.saveSettings();
				});
		});
	}
}

type CopyDocumentAsHTMLSettings = {
	/** Remove front-matter */
	removeFrontMatter: boolean;

	/** If set svg are converted to bitmap */
	convertSvgToBitmap: boolean;

	/** Render some elements as tables */
	formatAsTables: boolean;

	/** Embed external links (load them and embed their content) */
	embedExternalLinks: boolean;

	/** Remove dataview meta-data lines (format : `some-tag:: value` */
	removeDataviewMetadataLines: boolean;

	/** remember if the stylesheet was default or custom */
	useCustomStylesheet: boolean;

	/** Style-sheet */
	styleSheet: string;
}

const DEFAULT_SETTINGS: CopyDocumentAsHTMLSettings = {
	removeFrontMatter: true,
	convertSvgToBitmap: true,
	useCustomStylesheet: false,
	embedExternalLinks: false,
	removeDataviewMetadataLines: false,
	formatAsTables: false,
	styleSheet: DEFAULT_STYLESHEET
}

export default class CopyDocumentAsHTMLPlugin extends Plugin {
	settings: CopyDocumentAsHTMLSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'copy-as-html',
			name: 'Copy current document to clipboard',

			checkCallback: (checking: boolean): boolean => {
				if (copyIsRunning) {
					console.log('Document is already being copied');
					return false;
				}

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) {
					console.log('Nothing to copy: No active markdown view');
					return false;
				}

				if (!checking) {
					this.doCopy(activeView);
				}

				return true;
			},
		});

		// Register post-processors that keep track of the blocks being rendered. For explanation,
		// @see DocumentRenderer#untilRendered()

		const beforeAllPostProcessor = this.registerMarkdownPostProcessor(async () => {
			ppIsProcessing = true;
		});
		beforeAllPostProcessor.sortOrder = -10000;

		const afterAllPostProcessor = this.registerMarkdownPostProcessor(async () => {
			ppLastBlockDate = Date.now();
			ppIsProcessing = false;
		});
		afterAllPostProcessor.sortOrder = 10000;

		// Register UI elements
		this.addSettingTab(new CopyDocumentAsHTMLSettingsTab(this.app, this));
		this.setupEditorMenuEntry();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// reload it so we may update it in a new release
		if (!this.settings.useCustomStylesheet) {
			this.settings.styleSheet = DEFAULT_STYLESHEET;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async doCopy(activeView: MarkdownView) {
		console.log(`Copying "${activeView.file.path}" to clipboard...`);
		const copier = new DocumentRenderer(activeView, this.app, this.settings);

		try {
			copyIsRunning = true;

			ppLastBlockDate = Date.now();
			ppIsProcessing = true;

			const htmlBody = await copier.renderDocument();
			const htmlDocument = htmlTemplate(this.settings.styleSheet, htmlBody.outerHTML, activeView.file.name);

			const data =
				new ClipboardItem({
					"text/html": new Blob([htmlDocument], {
						// @ts-ignore
						type: ["text/html", 'text/plain']
					}),
					"text/plain": new Blob([htmlDocument], {
						type: "text/plain"
					}),
				});

			await navigator.clipboard.write([data]);
			console.log('Copied document to clipboard');
			new Notice('document copied to clipboard')
		} catch (error) {
			new Notice(`copy failed: ${error}`);
			console.error('copy failed', error);
		} finally {
			copyIsRunning = false;
		}
	}

	private setupEditorMenuEntry() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, view) => {
				menu.addItem((item) => {
					item
						.setTitle("Copy as HTML")
						.setIcon("clipboard-copy")
						.onClick(async () => {
							// @ts-ignore
							this.app.commands.executeCommandById('copy-document-as-html:copy-as-html');
						});
				});
			})
		);
	}
}
