# Copy Document as HTML

Plugin for [Obsidian](https://obsidian.md) that copies the current document to the clipboard, so it can be pasted into HTML aware application like gmail.

This plugin exposes the `Copy document as HTML` command, which can be bound to keyboard shortcuts (see below). Content can also be copied from the file explorer view.

![image](https://github.com/mvdkwast/obsidian-copy-as-html/assets/2441349/d6517572-507d-4d40-8bb5-b76f6bc85816)

## Features

### Commands

![copy-as-html-actions](https://github.com/mvdkwast/obsidian-copy-as-html/assets/2441349/acd8b8af-0714-4800-8724-a4fca025aa5c)

The commands can be bound to keyboard shortcuts from the hotkeys menu, or run using the commands menu (Ctrl+P)

**Copy selection or document to clipboard** : If text is selected, it will copied as HTML into the clipboard. If no text
is selected, the entire document is copied. This should probably be your default keyboard shortcut. (suggestion:
`Ctrl+Shift+C`)

**Copy entire document to clipboard** : Copy the entire document

**Copy current selection to clipboard** : Copy the selected text only 

### Media support

Currently working with :

- ✅ images
- ✅ plantuml
- ✅ diagrams
- ✅ obsidian-tasks
- ✅ obsidian-dataview - for large dataview blocks the content may not be complete
- ✅ Excalidraw - rendering as bitmap solves pasting in gmail
- ✅ Mermaid

![image](https://github.com/mvdkwast/obsidian-copy-as-html/assets/2441349/ea03c9e5-50ec-4a11-af91-f937126392a2)

### Styling

By default, simple styling is applied to the document. The stylesheet can be customized through the plugin settings, eg. to customize how tables or quotes look. Feel free to improve the current style and [show it the world](https://github.com/mvdkwast/obsidian-copy-as-html/discussions/categories/show-and-tell) !

![image](https://github.com/mvdkwast/obsidian-copy-as-html/assets/2441349/de0849b4-8779-457f-9349-2dacba7b699e)


## Advanced

- You may choose whether you want to embed external links (http, https) or not. If you don't (default), you will need internet access to view the document, and the linked image may be taken offline. If you do your documents will be larger.
- It is possible to customize or replace the stylesheet in the settings dialog. 
- The default is to convert SVG to bitmap for better compatibility at the cost of potential quality loss. If you know that you are pasting into an application with good .svg support, you can disable the `Convert SVG to bitmap` setting.
- It is possible to render code and callouts to HTML tables. This makes them ugly except in Google Docs where they make the document slightly prettier.
- If you have titles in your markdown files, use the filename as title
- If you don't need a full HTML document but only a HTML fragment, for instance to paste into an existing document enable the "Copy HTML fragment only" option.
- You may also retrieve the HTML content by pasting into a non-HTML editor, such as notepad.
- Provide your own HTML template

## Implementation

The plugin converts image references to data urls, so no references to the vault are included in the HTML.

## Known issues

- No mobile support
- Support for removing special dataview fields (double-colon attributes, ...) is experimental, and bracket notation is not supported. They are also not removed from transcluded files.
- data-uris can use a lot of memory for big/many pictures

Also see the [issues](https://github.com/mvdkwast/obsidian-copy-as-html/issues) section on github, and feel free to ask anything [here](https://github.com/mvdkwast/obsidian-copy-as-html/discussions).

## Install

Look for *Copy document as HTML* in the community plugin section in the Obsidian settings.

Don't be afraid to [report](https://github.com/mvdkwast/obsidian-copy-as-html/issues) or [ask](https://github.com/mvdkwast/obsidian-copy-as-html/discussions) if anything seems wrong !

## Development

Please see the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

## Credits

- Oliver Balfour for his [obsidian-pandoc](https://github.com/OliverBalfour/obsidian-pandoc) plugin, which helped me solve
some rendering issues.
- @TfTHacker for his [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin which makes beta-testing a breeze.
- PJ Eby for his [Hot-reload](https://github.com/pjeby/hot-reload) plugins which makes plugin development fast and fun.
- @jkunczik for enabling transclusions to work with heading references
- @Ivan1248 for making the generated HTML more standard-compliant and @fetwar for his constructive comments on the subject
- @vgyenge6 for his suggestions
- @HMLeeSoundcat for more customization ideas and providing sample code
- @Luiz-nyan for suggesting the inclusion of Obsidian links
