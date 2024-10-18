import xml.etree.ElementTree as ET

def merge_xml(file1, file2, output_file):
    # Parse the first XML file
    tree1 = ET.parse(file1)
    root1 = tree1.getroot()

    # Parse the second XML file
    tree2 = ET.parse(file2)
    root2 = tree2.getroot()

    # Merge the channel elements
    for child in root2:
        if child.tag == 'channel':
            root1.append(child)

    # Merge the programme elements
    for child in root2:
        if child.tag == 'programme':
            root1.append(child)

    # Write the merged XML to a new file
    tree1.write(output_file)

# Use the function
merge_xml('guide.xml', 'tp.guide.xml', 'epg.xml')
