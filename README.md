# Copy as HTML

Plugin for [Obsidian](https://obsidian.md) that copies the current document to the clipboard, so it can be pasted into
HTML aware application like gmail.

This plugin exposes the `Copy as HTML: Copy the current document to clipboard` command, which can be bound to a keyboard
shortcut.

## Support

Currently working with :

- ✅ images
- ✅ plantuml
- ✅ diagrams
- ✅ obsidian-tasks
- 👷 obsidian-dataview - content may be missing. Work-around: copy twice or switch to preview mode and back.
- 👷 Excalidraw - seems to cause the content to be duplicated in gmail, but not in
  other editors like [RichTextEditor](https://richtexteditor.com/demos/basic_editor.aspx).

## Implementation

The plugin converts image references to data urls, so no references to the vault are included in the HTML.

## Known issues

- Only works in edit mode.
- Post-processors like dataview may not have post-processed the preview documents, which may cause missing data
- The Excalidraw plugin output seems to confuse gmail, although the output looks ok.
- Special fields (front-matter, double-colon attributes, ...) are not removed.
- data-urls can use a lot of memory for big/many pictures

## TODO / wish-list

- Adjust image resolution / quality
- Wait for dataview & co to be ready
- Should be usable in preview mode also, using `Workspace.activeFile` 

## Development

Please see the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
