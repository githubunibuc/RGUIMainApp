var defaultSettings = {

    fontSize: '13px',
    fontFamily: 'Arial',

    // dialog properties
    dialog: { name: 'NewDialog', title: 'New dialog', width: 640, height: 480, dependencies: ''},
    
    // available dialog elements
    availableElements: ['Button', 'Checkbox', 'Container', 'Counter', 'Input', 'Label', 'Radio', 'Select', 'Separator', 'Slider'],

    // elements -----------------------------------------------------------

    button: { parentId: '', type: 'Button', name: 'button1', label: "My Button", left: '15', top: '15', isVisible: 'true', isEnabled: 'true', onClick: 'run', elementIds: [], conditions: ''},
        
    checkbox: { parentId: '', type: 'Checkbox', name: 'checkbox1', label: 'My checkbox', left: '10', top: '10', isChecked: 'false', isEnabled: 'true', isVisible: 'true', elementIds: [], conditions: ''},
    
    container: { parentId: '', type: 'Container', name: 'container1', objViewClass: 'variable', variableType: '', parentContainer: '', width: 150, height: 200, left: '15', top: '15', isVisible: 'true', isEnabled: 'true', elementIds: [], conditions: ''},
    
    counter: { parentId: '', type: 'Counter', name: 'counter1', startval: 1, maxval: 5, width: 25, left: '15', top: '15', isVisible: 'true', isEnabled: 'true', elementIds: [], conditions: ''},
    
    input: { parentId: '', type: 'Input', name: 'input1', 'width': 120, left: '15', top: '15', isVisible: 'true', isEnabled: 'true', value: '', elementIds: [], conditions: ''},
    
    label: { parentId: '', type: 'Label', name: 'label1', text: 'My label', left: '10', top: '10', fontSize: 13, isVisible: 'true', elementIds: [], conditions: ''},
    
    // plot: { parentId: '', type: 'Plot', name: 'plot1', width: 250, height: 220, left: '15', top: '15', isVisible: 'true', isEnabled: 'true', elementIds: [], conditions: ''},
    
    radio: { parentId: '', type: 'Radio', name: 'radio1', radioGroup: 'radiogroup1', label: 'My radiobox', left: '10', top: '10', isSelected: 'false', isEnabled: 'true', isVisible: 'true', elementIds: [], conditions: ''},

    select: { parentId: '', type: 'Select', name: 'select1', 'width': 120, label: "My Select", left: '15', top: '15', isVisible: 'true', isEnabled: 'true', dataSource: 'custom', dataValue: '', elementIds: [], conditions: ''},
    
    separator: { parentId: '', type: 'Separator', name: 'separator1', direction: 'x', left: '10', top: '10', length: 300, isVisible: 'true', elementIds: [], conditions: ''},

    slider: { parentId: '', type: 'Slider', name: 'slider1', left: '15', top: '15', value: 0.5, length: 200, isVisible: 'true', isEnabled: 'true', elementIds: [], conditions: ''}

};

module.exports = defaultSettings;