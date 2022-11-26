# Copy Document as HTML

Plugin for [Obsidian](https://obsidian.md) that copies the current document to the clipboard, so it can be pasted into HTML aware application like gmail.

This plugin exposes the `Copy document as HTML: Copy the current document to clipboard` command, which can be bound to a keyboard shortcut.

![image](https://user-images.githubusercontent.com/2441349/202304790-aea2a29e-2ed8-4ba2-bfb6-caaeb823e6f0.png)

## Features

Simple styling is applied to the document. 

Currently working with :

- ✅ images
- ✅ plantuml
- ✅ diagrams
- ✅ obsidian-tasks
- ✅ obsidian-dataview - for large dataview blocks the content may not be complete
- ✅ Excalidraw - rendering as bitmap solves pasting in gmail
- ✅ Mermaid

### Advanced

- It is possible to customize or replace the stylesheet in the settings dialog. 
- The default is to convert SVG to bitmap for better compatibility at the cost of potential quality loss. If you know
  that the application you are going to paste into has good .svg support, you can toggle the `Convert SVG to bitmap`
  setting.

### Api Functions
Functions that expose some basic functionality of the plugin for use in js code blocks and in other plugins.

- **Note**: These functions are available though the plugin instance itself from the app global object in js.
- **Note**: All functions are async! They return promises you must await!
### <u>Convert View</u>
Convert a markdown view to an html element.

_Params_:
* *{MarkdownView}* **view** The markdown: view to convert
* *{{convertSvgToBitmap: boolean, removeFrontMatter: boolean}}* **options**: The options to pass to the converter.

*Return*: 
- **Promise\<HTMLElement>**: A promise for an html element with the result of the markdown as html

### <u>Convert Markdown</u>
Convert a raw markdown string to an html element.

- **Note**: This may cause tabs to open and close temporatily in the background, this is nessicary to render the items property without using the current view.

_Params_:
* *{string}* **markdown**: The raw markdown content string to convert
* *{string | undefined}* **sourceFilePath**: The source file to use for fetching frontmatter, links, embeds, etc.
* *{{convertSvgToBitmap: boolean, removeFrontMatter: boolean}}* **options**: The options to pass to the converter.

*Return*: 
- **Promise\<HTMLElement>**: A promise for an html element with the result of the markdown as html

## Implementation

The plugin converts image references to data urls, so no references to the vault are included in the HTML.

## Known issues

- No mobile support
- Special fields (double-colon attributes, ...) are not removed. (front-matter is)
- data-uris can use a lot of memory for big/many pictures

## Install

Look for *Copy document as HTML* in the community plugin section in the Obsidian settings.

Don't be afraid to comment if anything seems wrong !

## Development

Please see the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

## Credits

- Oliver Balfour for his [obsidian-pandoc](https://github.com/OliverBalfour/obsidian-pandoc) plugin, which helped me solve
some rendering issues.
- TfTHacker for his [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin which makes beta-testing a breeze.
- PJ Eby for his [Hot-reload](https://github.com/pjeby/hot-reload) plugins which makes plugin development fast and fun.
