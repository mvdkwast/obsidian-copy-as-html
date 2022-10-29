import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

async function imageToUri(url: string): Promise<string> {
	if (url.startsWith('data:')) {
		return url;
	}

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	const base_image = new Image();
	base_image.src = url;

	console.log(`converting image: ${url.substring(0, 40)}`);

	return new Promise((resolve, reject) => {
		base_image.onload = () => {
			canvas.width = base_image.width;
			canvas.height = base_image.height;

			ctx!.drawImage(base_image, 0, 0);

			try {
				const uri = canvas.toDataURL('image/png');
				console.log(`converting done: ${uri.substring(0, 40)} (${canvas.height}x${canvas.width}`);
				resolve(uri);
			}
			catch (err) {
				console.log(`feiled ${url}`, err);
				// leave original url
				resolve(url);
				// reject(err);
			}

			canvas.remove();
		}
	})
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

	console.log('element', element);

	node.querySelectorAll('img')
		.forEach(img => {
			if (img.src && !img.src.startsWith('data:')) {
				promises.push(replaceImageSource(img));
			}
		});

	console.log(`awaiting ${promises.length} promises`)
	await Promise.all(promises);

	console.log('done');
	return node;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// console.log(editor.content);
				// console.log(view.contentEl);
				// editor.replaceSelection('Sample Editor Command');

				const copy = await embedImages(view.contentEl);
				console.log('copy', copy.outerHTML);

				const data =
					new ClipboardItem({
						"text/html": new Blob([copy.outerHTML], {
							type: "text/html"
						}),
						"text/plain": new Blob([copy.outerHTML], {
							type: "text/plain"
						}),
					});

				await navigator.clipboard.write([data]);
			}
		});

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
