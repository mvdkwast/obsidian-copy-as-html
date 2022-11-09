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
- ✅ obsidian-dataview - for large dataview blocks the content may not be complete
- ✅ Excalidraw - rendering as bitmap solves pasting in gmail

## Implementation

The plugin converts image references to data urls, so no references to the vault are included in the HTML.

## Known issues

- No mobile support yet
- Special fields (front-matter, double-colon attributes, ...) are not removed.
- data-uris can use a lot of memory for big/many pictures

## TODO / wish-list

- Adjust image resolution / quality

## Development

Please see the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

## Credits

Oliver Balfour for his [obsidian-pandoc](https://github.com/OliverBalfour/obsidian-pandoc) plugin, which helped me solve
some rendering issues.
