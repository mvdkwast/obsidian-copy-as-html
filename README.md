# Copy as HTML

Plugin for [Obsidian](https://obsidian.md) that copies the current document to the clipboard, so it can be pasted into
HTML aware application like gmail.

This plugin exposes the `Copy as HTML: Copy the current document to clipboard` command, which can be bound to a keyboard
shortcut.

> **WARNING**: From edit mode enter preview mode and go back to edit mode to make sure the view is up-to-date.

## Support

Currently working with :
- [x] images
- [x] plantuml
- [x] Excalidraw
- [x] diagrams
- [x] obsidian-tasks
- [x] obsidian-dataview

## Implementation

The plugin converts image references to data urls so images from the vault are included.

## Known issues

- The plugin uses the HTML from the preview mode, which may not be up-to-date, hence needing to switch back and forth.
- Don't change focus until a notification saying "document copied to clipboard" appears.
- Special fields (front-matter, double-colon attributes, ...) are not removed.
- data-urls can use a lot of memory for big/many pictures

## TODO / wish-list

- Automate the update of the preview
- Display a modal during the copy so the focus cannot be changed, and to provide user feedback that the copy is being
  built since it can take a few seconds.
- Adjust image resolution / quality
