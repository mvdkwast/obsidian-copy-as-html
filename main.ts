import {
	App,
	arrayBufferToBase64,
	Component,
	FileSystemAdapter,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile
} from 'obsidian';

/*
 * Generic lib functions
 */

/**
 * Like Promise.all(), but with a callback to indicate progress. Graciously lifted from
 * https://stackoverflow.com/a/42342373/1341132
 */
function allWithProgress(promises: Promise<never>[], callback: (percentCompleted: number) => void) {
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
  --background-secondary-alt: #fcfcfc;
  --text-muted: #888888;
  --font-mermaid: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
  --text-error: #E4374B;
  --background-primary-alt: '#fafafa';
  --background-accent: '';
  --interactive-accent: hsl( 254,  80%, calc( 68% + 2.5%));
  --background-modifier-error: #E4374B;
  --background-primary-alt: #fafafa;
  --background-modifier-border: #e0e0e0;
}
`;

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>\${title}</title>
  <style>
    \${MERMAID_STYLESHEET}
    \${stylesheet}
  </style>
</head>
<body>
\${body}
</body>
</html>
`;


/*
 * Plugin code
 */

/** Don't allow multiple copy processes to run at the same time */
let copyIsRunning = false;

/** true while a block is being processed by MarkDownPostProcessor instances */
let ppIsProcessing = false;

/** moment at which the last block finished post-processing */
let ppLastBlockDate = Date.now();


enum FootnoteHandling {
	/** Remove references and links */
	REMOVE_ALL,

	/** Reference links to footnote using a unique id */
	LEAVE_LINK,

	/** Links are removed from reference and back-link from footnote */
	REMOVE_LINK,

	/** Footnote is moved to title attribute */
	TITLE_ATTRIBUTE
}

enum InternalLinkHandling {
	/**
	 * remove link and only display link text
	 */
	CONVERT_TO_TEXT,

	/**
	 * convert to an obsidian:// link to open the file or tag in Obsidian
	 */
	CONVERT_TO_OBSIDIAN_URI,

	/**
	 * Keep link, but convert extension to .html
	 */
	LINK_TO_HTML,

	/**
	 * Keep generated link
	 */
	LEAVE_AS_IS
}

/**
 * Options for DocumentRenderer
 */
type DocumentRendererOptions = {
	convertSvgToBitmap: boolean,
	removeFrontMatter: boolean,
	formatCodeWithTables: boolean,
	formatCalloutsWithTables: boolean,
	embedExternalLinks: boolean,
	removeDataviewMetadataLines: boolean,
	footnoteHandling: FootnoteHandling
	internalLinkHandling: InternalLinkHandling,
	disableImageEmbedding: boolean
};

const documentRendererDefaults: DocumentRendererOptions = {
	convertSvgToBitmap: true,
	removeFrontMatter: true,
	formatCodeWithTables: false,
	formatCalloutsWithTables: false,
	embedExternalLinks: false,
	removeDataviewMetadataLines: false,
	footnoteHandling: FootnoteHandling.REMOVE_LINK,
	internalLinkHandling: InternalLinkHandling.CONVERT_TO_TEXT,
	disableImageEmbedding: false
};

/**
 * Render markdown to DOM, with some clean-up and embed images as data uris.
 */
class DocumentRenderer {
	private modal: CopyingToHtmlModal;
	private view: Component;

	// time required after last block was rendered before we decide that rendering a view is completed
	private optionRenderSettlingDelay: number = 100;

	// only those which are different from image/${extension}
	private readonly mimeMap = new Map([
		['svg', 'image/svg+xml'],
		['jpg', 'image/jpeg'],
	]);

	private readonly externalSchemes = ['http', 'https'];

	private readonly vaultPath: string;
	private readonly vaultLocalUriPrefix: string;
	private readonly vaultOpenUri: string;
	private readonly vaultSearchUri: string;

	constructor(private app: App,
				private options: DocumentRendererOptions = documentRendererDefaults) {
		this.vaultPath = (this.app.vault.getRoot().vault.adapter as FileSystemAdapter).getBasePath()
			.replace(/\\/g, '/');

		this.vaultLocalUriPrefix = `app://local/${this.vaultPath}`;

		this.vaultOpenUri = `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}`;
		this.vaultSearchUri = `obsidian://search?vault=${encodeURIComponent(this.app.vault.getName())}`;

		this.view = new Component();
	}

	/**
	 * Render document into detached HTMLElement
	 */
	public async renderDocument(markdown: string, path: string): Promise<HTMLElement> {
		this.modal = new CopyingToHtmlModal(this.app);
		this.modal.open();

		try {
			const topNode = await this.renderMarkdown(markdown, path);
			return await this.transformHTML(topNode!);
		} finally {
			this.modal.close();
		}
	}

	/**
	 * Render current view into HTMLElement, expanding embedded links
	 */
	private async renderMarkdown(markdown: string, path: string): Promise<HTMLElement> {
		const processedMarkdown = this.preprocessMarkdown(markdown);

		const wrapper = document.createElement('div');
		wrapper.style.display = 'hidden';
		document.body.appendChild(wrapper);
		await MarkdownRenderer.render(this.app, processedMarkdown, wrapper, path, this.view);
		await this.untilRendered();

		await this.loadComponents(this.view);

		const result = wrapper.cloneNode(true) as HTMLElement;
		document.body.removeChild(wrapper);

		this.view.unload();
		return result;
	}

	/**
	 * Some plugins may expose components that rely on onload() to be called which isn't the case due to the
	 * way we render the markdown. We need to call onload() on all components to ensure they are properly loaded.
	 * Since this is a bit of a hack (we need to access Obsidian internals), we limit this to components of which
	 * we know that they don't get rendered correctly otherwise.
	 * We attempt to make sure that if the Obsidian internals change, this will fail gracefully.
	 */
	private async loadComponents(view: Component) {
		type InternalComponent = Component & {
			_children: Component[];
			onload: () => void | Promise<void>;
		}

		const internalView = view as InternalComponent;

		// recursively call onload() on all children, depth-first
		const loadChildren = async (
			component: Component,
			visited: Set<Component> = new Set()
		): Promise<void> => {
			if (visited.has(component)) {
				return;  // Skip if already visited
			}

			visited.add(component);

			const internalComponent = component as InternalComponent;

			if (internalComponent._children?.length) {
				for (const child of internalComponent._children) {
					await loadChildren(child, visited);
				}
			}

			try {
				// relies on the Sheet plugin (advanced-table-xt) not to be minified
				if (component?.constructor?.name === 'SheetElement') {
					await component.onload();
				}
			} catch (error) {
				console.error(`Error calling onload()`, error);
			}
		};

		await loadChildren(internalView);
	}

	private preprocessMarkdown(markdown: string): string {
		let processed = markdown;

		if (this.options.removeDataviewMetadataLines) {
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
	 * with high-priority (low-number to mark the block as being processed), and another one with low-priority that
	 * runs after all other post-processors.
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

		this.replaceLinksOfClass(node, 'internal-link');
		this.replaceLinksOfClass(node, 'tag');
		this.makeCheckboxesReadOnly(node);
		this.removeCollapseIndicators(node);
		this.removeButtons(node);
		this.removeStrangeNewWorldsLinks(node);

		if (this.options.formatCodeWithTables) {
			this.transformCodeToTables(node);
		}

		if (this.options.formatCalloutsWithTables) {
			this.transformCalloutsToTables(node);
		}

		if (this.options.footnoteHandling == FootnoteHandling.REMOVE_ALL) {
			this.removeAllFootnotes(node);
		}
		if (this.options.footnoteHandling == FootnoteHandling.REMOVE_LINK) {
			this.removeFootnoteLinks(node);
		} else if (this.options.footnoteHandling == FootnoteHandling.TITLE_ATTRIBUTE) {
			// not supported yet
		}

		if (!this.options.disableImageEmbedding) {
			await this.embedImages(node);
			await this.renderSvg(node);
		}

		return node;
	}

	/** Remove front-matter */
	private removeFrontMatter(node: HTMLElement) {
		node.querySelectorAll('.frontmatter, .frontmatter-container')
			.forEach(node => node.remove());
	}

	private replaceLinksOfClass(node: HTMLElement, className: string) {
		if (this.options.internalLinkHandling === InternalLinkHandling.LEAVE_AS_IS) {
			return;
		}

		node.querySelectorAll(`a.${className}`)
			.forEach(node => {
				switch (this.options.internalLinkHandling) {
					case InternalLinkHandling.CONVERT_TO_OBSIDIAN_URI: {
						const linkNode = node.parentNode!.createEl('a');
						linkNode.innerText = node.getText();

						if (className === 'tag') {
							linkNode.href = this.vaultSearchUri + "&query=tag:" + encodeURIComponent(node.getAttribute('href')!);
						} else {
							if (node.getAttribute('href')!.startsWith('#')) {
								linkNode.href = node.getAttribute('href')!;
							} else {
								linkNode.href = this.vaultOpenUri + "&file=" + encodeURIComponent(node.getAttribute('href')!);
							}
						}
						linkNode.className = className;
						node.parentNode!.replaceChild(linkNode, node);
					}
						break;

					case InternalLinkHandling.LINK_TO_HTML: {
						const linkNode = node.parentNode!.createEl('a');
						linkNode.innerText = node.getAttribute('href')!; //node.getText();
						linkNode.className = className;
						if (node.getAttribute('href')!.startsWith('#')) {
							linkNode.href = node.getAttribute('href')!;
						} else {
							linkNode.href = node.getAttribute('href')!.replace(/^(.*?)(?:\.md)?(#.*?)?$/, '$1.html$2');
						}
						node.parentNode!.replaceChild(linkNode, node);
					}
						break;

					case InternalLinkHandling.CONVERT_TO_TEXT:
					default: {
						const textNode = node.parentNode!.createEl('span');
						textNode.innerText = node.getText();
						textNode.className = className;
						node.parentNode!.replaceChild(textNode, node);
					}
						break;
				}
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

	/** Remove counters added by Strange New Worlds plugin (https://github.com/TfTHacker/obsidian42-strange-new-worlds) */
	private removeStrangeNewWorldsLinks(node: HTMLElement) {
		node.querySelectorAll('.snw-reference')
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

				node.replaceWith(callout);
			});
	}

	/** Remove references to footnotes and the footnotes section */
	private removeAllFootnotes(node: HTMLElement) {
		node.querySelectorAll('section.footnotes')
			.forEach(section => section.parentNode!.removeChild(section));

		node.querySelectorAll('.footnote-link')
			.forEach(link => {
				link.parentNode!.parentNode!.removeChild(link.parentNode!);
			});
	}

	/** Keep footnotes and references, but remove links */
	private removeFootnoteLinks(node: HTMLElement) {
		node.querySelectorAll('.footnote-link')
			.forEach(link => {
				const text = link.getText();
				if (text === '↩︎') {
					// remove back-link
					link.parentNode!.removeChild(link);
				} else {
					// remove from reference
					const span = link.parentNode!.createEl('span', {text: link.getText(), cls: 'footnote-link'})
					link.parentNode!.replaceChild(span, link);
				}
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
						} else {
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
			const style: HTMLStyleElement = svg.querySelector('style') || svg.appendChild(document.createElement('style'));
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

		if (imageSourcePath.startsWith(this.vaultLocalUriPrefix)) {
			// Transform uri to Obsidian relative path
			let path = imageSourcePath.substring(this.vaultLocalUriPrefix.length + 1)
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
		const {titleEl, contentEl} = this;
		titleEl.setText('Copying to clipboard');
		this._progress = contentEl.createEl('progress');
		this._progress.style.width = '100%';
	}

	onClose() {
		const {contentEl} = this;
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

	// Thank you, Obsidian Tasks !
	private static createFragmentWithHTML = (html: string) =>
		createFragment((documentFragment) => (documentFragment.createDiv().innerHTML = html));

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
			.setName('Render code with tables')
			.setDesc("If checked code blocks are rendered as tables, which makes pasting into Google docs somewhat prettier.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.formatCodeWithTables)
				.onChange(async (value) => {
					this.plugin.settings.formatCodeWithTables = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Render callouts with tables')
			.setDesc("If checked callouts are rendered as tables, which makes pasting into Google docs somewhat prettier.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.formatCalloutsWithTables)
				.onChange(async (value) => {
					this.plugin.settings.formatCalloutsWithTables = value;
					await this.plugin.saveSettings();
				}));


		containerEl.createEl('h3', {text: 'Rendering'});

		new Setting(containerEl)
			.setName('Include filename as header')
			.setDesc("If checked, the filename is inserted as a level 1 header. (only if an entire document is copied)")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.fileNameAsHeader)
				.onChange(async (value) => {
					this.plugin.settings.fileNameAsHeader = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Copy HTML fragment only')
			.setDesc("If checked, only generate a HTML fragment and not a full HTML document. This excludes the header, and effectively disables all styling.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bareHtmlOnly)
				.onChange(async (value) => {
					this.plugin.settings.bareHtmlOnly = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remove properties / front-matter sections')
			.setDesc("If checked, the YAML content between --- lines at the front of the document are removed. If you don't know what this means, leave it on.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeFrontMatter)
				.onChange(async (value) => {
					this.plugin.settings.removeFrontMatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remove dataview metadata lines')
			.setDesc(CopyDocumentAsHTMLSettingsTab.createFragmentWithHTML(`
				<p>Remove lines that only contain dataview meta-data, eg. "rating:: 9". Metadata between square brackets is left intact.</p>
				<p>Current limitations are that lines starting with a space are not removed, and lines that look like metadata in code blocks are removed if they don't start with a space</p>`))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeDataviewMetadataLines)
				.onChange(async (value) => {
					this.plugin.settings.removeDataviewMetadataLines = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Footnote handling')
			.setDesc(CopyDocumentAsHTMLSettingsTab.createFragmentWithHTML(`
				<ul>
				  <li>Remove everything: Remove references and links.</li>
				  <li>Display only: leave reference and foot-note, but don't display as a link.</li> 
				  <li>Display and link: attempt to link the reference to the footnote, may not work depending on paste target.</li>
				</ul>`)
			)
			.addDropdown(dropdown => dropdown
				.addOption(FootnoteHandling.REMOVE_ALL.toString(), 'Remove everything')
				.addOption(FootnoteHandling.REMOVE_LINK.toString(), 'Display only')
				.addOption(FootnoteHandling.LEAVE_LINK.toString(), 'Display and link')
				.setValue(this.plugin.settings.footnoteHandling.toString())
				.onChange(async (value) => {
					switch (value) {
						case FootnoteHandling.TITLE_ATTRIBUTE.toString():
							this.plugin.settings.footnoteHandling = FootnoteHandling.TITLE_ATTRIBUTE;
							break;
						case FootnoteHandling.REMOVE_ALL.toString():
							this.plugin.settings.footnoteHandling = FootnoteHandling.REMOVE_ALL;
							break;
						case FootnoteHandling.REMOVE_LINK.toString():
							this.plugin.settings.footnoteHandling = FootnoteHandling.REMOVE_LINK;
							break;
						case FootnoteHandling.LEAVE_LINK.toString():
						default:
							this.plugin.settings.footnoteHandling = FootnoteHandling.LEAVE_LINK;
							break;
					}
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Link handling')
			.setDesc(CopyDocumentAsHTMLSettingsTab.createFragmentWithHTML(`
				This option controls how links to Obsidian documents and tags are handled.
				<ul>
				  <li>Don't link: only render the link title</li>
				  <li>Open with Obsidian: convert the link to an obsidian:// URI</li> 
				  <li>Link to HTML: keep the link, but convert the extension to .html</li>
				  <li>Leave as is: keep the generated link</li>	
				</ul>`)
			)
			.addDropdown(dropdown => dropdown
				.addOption(InternalLinkHandling.CONVERT_TO_TEXT.toString(), 'Don\'t link')
				.addOption(InternalLinkHandling.CONVERT_TO_OBSIDIAN_URI.toString(), 'Open with Obsidian')
				.addOption(InternalLinkHandling.LINK_TO_HTML.toString(), 'Link to HTML')
				.addOption(InternalLinkHandling.LEAVE_AS_IS.toString(), 'Leave as is')
				.setValue(this.plugin.settings.internalLinkHandling.toString())
				.onChange(async (value) => {
					switch (value) {
						case InternalLinkHandling.CONVERT_TO_OBSIDIAN_URI.toString():
							this.plugin.settings.internalLinkHandling = InternalLinkHandling.CONVERT_TO_OBSIDIAN_URI;
							break;
						case InternalLinkHandling.LINK_TO_HTML.toString():
							this.plugin.settings.internalLinkHandling = InternalLinkHandling.LINK_TO_HTML;
							break;
						case InternalLinkHandling.LEAVE_AS_IS.toString():
							this.plugin.settings.internalLinkHandling = InternalLinkHandling.LEAVE_AS_IS;
							break;
						case InternalLinkHandling.CONVERT_TO_TEXT.toString():
						default:
							this.plugin.settings.internalLinkHandling = InternalLinkHandling.CONVERT_TO_TEXT;
							break;
					}
					await this.plugin.saveSettings();
				})
			)

		containerEl.createEl('h3', {text: 'Custom templates (advanced)'});

		const useCustomStylesheetSetting = new Setting(containerEl)
			.setName('Provide a custom stylesheet')
			.setDesc('The default stylesheet provides minimalistic theming. You may want to customize it for better looks. Disabling this setting will restore the default stylesheet.');

		const customStylesheetSetting = new Setting(containerEl)
			.setClass('customizable-text-setting')
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

		const useCustomHtmlTemplateSetting = new Setting(containerEl)
			.setName('Provide a custom HTML template')
			.setDesc(CopyDocumentAsHTMLSettingsTab.createFragmentWithHTML(`For even more customization, you can 
provide a custom HTML template. Disabling this setting will restore the default template.<br/><br/>
Note that the template is not used if the "Copy HTML fragment only" setting is enabled.`));

		const customHtmlTemplateSetting = new Setting(containerEl)
			.setDesc(CopyDocumentAsHTMLSettingsTab.createFragmentWithHTML(`
			The template should include the following placeholders :<br/>
<ul>
	<li><code>$\{title}</code>: the document title</li>
	<li><code>$\{stylesheet}</code>: the CSS stylesheet. The custom stylesheet will be applied if any is specified</li>
	<li><code>$\{MERMAID_STYLESHEET}</code>: the CSS for mermaid diagrams</li>
	<li><code>$\{body}</code>: the document body</li>
</ul>`))
			.setClass('customizable-text-setting')
			.addTextArea(textArea => textArea
				.setValue(this.plugin.settings.htmlTemplate)
				.onChange(async (value) => {
					this.plugin.settings.htmlTemplate = value;
					await this.plugin.saveSettings();
				}));

		useCustomHtmlTemplateSetting.addToggle(toggle => {
			customHtmlTemplateSetting.settingEl.toggle(this.plugin.settings.useCustomHtmlTemplate);

			toggle
				.setValue(this.plugin.settings.useCustomHtmlTemplate)
				.onChange(async (value) => {
					this.plugin.settings.useCustomHtmlTemplate = value;
					customHtmlTemplateSetting.settingEl.toggle(this.plugin.settings.useCustomHtmlTemplate);
					if (!value) {
						this.plugin.settings.htmlTemplate = DEFAULT_HTML_TEMPLATE;
					}
					await this.plugin.saveSettings();
				});
		});

		containerEl.createEl('h3', {text: 'Exotic / Developer options'});

		new Setting(containerEl)
			.setName("Don't embed images")
			.setDesc("When this option is enabled, images will not be embedded in the HTML document, but <em>broken</em> links will be left in place. This is not recommended.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.disableImageEmbedding)
				.onChange(async (value) => {
					this.plugin.settings.disableImageEmbedding = value;
					await this.plugin.saveSettings();
				}));
	}
}

type CopyDocumentAsHTMLSettings = {
	/** Remove front-matter */
	removeFrontMatter: boolean;

	/** If set svg are converted to bitmap */
	convertSvgToBitmap: boolean;

	/** Render code elements as tables */
	formatCodeWithTables: boolean;

	/** Render callouts as tables */
	formatCalloutsWithTables: boolean;

	/** Embed external links (load them and embed their content) */
	embedExternalLinks: boolean;

	/** Remove dataview meta-data lines (format : `some-tag:: value` */
	removeDataviewMetadataLines: boolean;

	/** How are foot-notes displayed ? */
	footnoteHandling: FootnoteHandling;

	/** How are internal links handled ? */
	internalLinkHandling: InternalLinkHandling;

	/** remember if the stylesheet was default or custom */
	useCustomStylesheet: boolean;

	/**
	 * remember if the HTML wrapper was default or custom
	 */
	useCustomHtmlTemplate: boolean;

	/** Style-sheet */
	styleSheet: string;

	/**
	 * HTML wrapper
	 */
	htmlTemplate: string;

	/** Only generate the HTML body, don't include the <head> section */
	bareHtmlOnly: boolean;

	/** Include filename in copy. Only when entire document is copied */
	fileNameAsHeader: boolean;

	/**
	 * Don't replace image links with data: uris. No idea why you would want this, but here you go.
	 */
	disableImageEmbedding: boolean;
}

const DEFAULT_SETTINGS: CopyDocumentAsHTMLSettings = {
	removeFrontMatter: true,
	convertSvgToBitmap: true,
	useCustomStylesheet: false,
	useCustomHtmlTemplate: false,
	embedExternalLinks: false,
	removeDataviewMetadataLines: false,
	formatCodeWithTables: false,
	formatCalloutsWithTables: false,
	footnoteHandling: FootnoteHandling.REMOVE_LINK,
	internalLinkHandling: InternalLinkHandling.CONVERT_TO_TEXT,
	styleSheet: DEFAULT_STYLESHEET,
	htmlTemplate: DEFAULT_HTML_TEMPLATE,
	bareHtmlOnly: false,
	fileNameAsHeader: false,
	disableImageEmbedding: false,
}

export default class CopyDocumentAsHTMLPlugin extends Plugin {
	settings: CopyDocumentAsHTMLSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'smart-copy-as-html',
			name: 'Copy selection or document to clipboard',
			checkCallback: this.buildCheckCallback(
				view => this.copyFromView(view, view.editor.somethingSelected()))
		})

		this.addCommand({
			id: 'copy-as-html',
			name: 'Copy entire document to clipboard',
			checkCallback: this.buildCheckCallback(view => this.copyFromView(view, false))
		});

		this.addCommand({
			id: 'copy-selection-as-html',
			name: 'Copy current selection to clipboard',
			checkCallback: this.buildCheckCallback(view => this.copyFromView(view, true))
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

		if (!this.settings.useCustomHtmlTemplate) {
			this.settings.htmlTemplate = DEFAULT_HTML_TEMPLATE;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private buildCheckCallback(action: (activeView: MarkdownView) => void) {
		return (checking: boolean): boolean => {
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
				action(activeView);
			}

			return true;
		}
	}

	private async copyFromView(activeView: MarkdownView, onlySelected: boolean) {
		if (!activeView.editor) {
			console.error('No editor in active view, nothing to copy');
			return;
		}

		if (!activeView.file) {
			// should not happen if we have an editor in the active view ?
			console.error('No file in active view, nothing to copy');
			return;
		}

		const markdown = onlySelected ? activeView.editor.getSelection() : activeView.data;

		const path = activeView.file.path;
		const name = activeView.file.name;
		return this.doCopy(markdown, path, name, !onlySelected);
	}

	private async copyFromFile(file: TAbstractFile) {
		if (!(file instanceof TFile)) {
			console.log(`cannot copy folder to HTML: ${file.path}`);
			return;
		}

		if (file.extension.toLowerCase() !== 'md') {
			console.log(`cannot only copy .md files to HTML: ${file.path}`);
			return;
		}

		const markdown = await file.vault.cachedRead(file);
		return this.doCopy(markdown, file.path, file.name, true);
	}

	private async doCopy(markdown: string, path: string, name: string, isFullDocument: boolean) {
		console.log(`Copying "${path}" to clipboard...`);
		const title = name.replace(/\.md$/i, '');

		const copier = new DocumentRenderer(this.app, this.settings);

		try {
			copyIsRunning = true;

			ppLastBlockDate = Date.now();
			ppIsProcessing = true;

			const htmlBody = await copier.renderDocument(markdown, path);

			if (this.settings.fileNameAsHeader && isFullDocument) {
				const h1 = htmlBody.createEl('h1');
				h1.innerHTML = title;
				htmlBody.insertBefore(h1, htmlBody.firstChild);
			}

			const htmlDocument = this.settings.bareHtmlOnly
				? htmlBody.outerHTML
				: this.expandHtmlTemplate(htmlBody.outerHTML, title);

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
			console.log(`Copied to clipboard as HTML`);
			new Notice(`Copied to clipboard as HTML`)
		} catch (error) {
			new Notice(`copy failed: ${error}`);
			console.error('copy failed', error);
		} finally {
			copyIsRunning = false;
		}
	}

	private expandHtmlTemplate(html: string, title: string) {
		const template = this.settings.useCustomHtmlTemplate
			? this.settings.htmlTemplate
			: DEFAULT_HTML_TEMPLATE;

		return template
			.replace('${title}', title)
			.replace('${body}', html)
			.replace('${stylesheet}', this.settings.styleSheet)
			.replace('${MERMAID_STYLESHEET}', MERMAID_STYLESHEET);
	}

	private setupEditorMenuEntry() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, view) => {
				menu.addItem((item) => {
					item
						.setTitle("Copy as HTML")
						.setIcon("clipboard-copy")
						.onClick(async () => {
							return this.copyFromFile(file);
						});
				});
			})
		);
	}
}
