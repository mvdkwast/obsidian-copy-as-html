import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';

async function imageToUri(url: string): Promise<string> {
	if (url.startsWith('data:')) {
		return url;
	}

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	const base_image = new Image();
	base_image.setAttribute('crossOrigin', 'anonymous');

	console.log(`converting image: ${url.substring(0, 40)}`);

	const dataUriPromise = new Promise<string>((resolve, reject) => {
		base_image.onload = () => {
			// TODO: resize image
			canvas.width = base_image.naturalWidth;
			canvas.height = base_image.naturalHeight;

			ctx!.drawImage(base_image, 0, 0);

			try {
				const uri = canvas.toDataURL('image/png');
				console.log(`converting done: ${uri.substring(0, 40)} (${canvas.height}x${canvas.width}`);
				resolve(uri);
			}
			catch (err) {
				console.log(`feiled ${url}`, err);
				// leave original url
				// images from plantuml.com cannot be loaded this way (tainted)
				resolve(url);
				// reject(err);
			}

			canvas.remove();
		}
	})

	base_image.src = url;
	return dataUriPromise;
}

function cloneElement(element: HTMLElement): HTMLElement {
	// @ts-ignore
	return element.cloneNode(true);
}

async function replaceImageSource(image: HTMLImageElement): Promise<void> {
	image.src = await imageToUri(image.src);
}

async function embedImages(element: HTMLElement): Promise<HTMLElement> {
	const node = cloneElement(element);

	const promises: Promise<void>[] = [];

	node.querySelectorAll('img')
		.forEach(img => {
			if (img.src && !img.src.startsWith('data:')) {
				promises.push(replaceImageSource(img));
			}
		});

	await Promise.all(promises);
	return node;
}

export default class CopyAsHTMLPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'copy-as-html',
			name: 'Copy current document to clipboard',

			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					// @ts-ignore
					const topNode: HTMLElement = view.contentEl.querySelector('.markdown-reading-view .markdown-preview-section')
					let document = await embedImages(topNode!);

					const data =
						new ClipboardItem({
							"text/html": new Blob([document.outerHTML], {
								type: "text/html"
							}),
							"text/plain": new Blob([document.innerText], {
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
