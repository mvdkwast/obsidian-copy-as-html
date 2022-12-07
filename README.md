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
- The default is to convert SVG to bitmap for better compatibility at the cost of potential quality loss. If you know that the application you are going to paste into has good .svg support, you can disable the `Convert SVG to bitmap` setting.
- It is possible to render code and callouts to HTML tables. This makes them ugly except in Google Docs where they make the document slightly prettier. 

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
