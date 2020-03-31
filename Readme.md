# Data driven mindmap based on d3j

rich data formating convension:

 - icons - sub key-value with key `mm-icon` ( pick from font awsome  )
 - alligment  - sub key-value with key `mm-alligment`
 - font color - sub key-value with key `mm-font-color`
 - text background - sub key-value with key `mm-background`
 - hyperlink - sub key-value with key `mm-hyperlink`

parent - child relation:

It's plain YAML, so for example
```
main subject:
  subject:
    sub_subject:
  2nd subject:
    sub_subject:
    andother:
```


## Testing

 - Edit data.yaml
 - Run
```
python3 -m http.server
```
 - Open a browser and visit http://localhost:8000
 - Keep editing data.yaml
 - Hit refresh in the browser

Current state can be viewed at [GitHub Pages](https://kisst.github.io/mindmap/)
