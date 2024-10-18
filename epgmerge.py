import xml.etree.ElementTree as ET

def merge_xml(file1, file2, output_file):
    try:
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

        # Separate the programme elements from the first file
        programme_elements_1 = [child for child in root1 if child.tag == 'programme']
        for child in programme_elements_1:
            root1.remove(child)

        # Merge the programme elements
        for child in root2:
            if child.tag == 'programme':
                root1.append(child)

        # Add the separated programme elements from the first file back to the root
        for child in programme_elements_1:
            root1.append(child)

        # Write the merged XML to a new file
        tree1.write(output_file, xml_declaration=True, encoding='UTF-8')

        print("XML files merged successfully.")
    except ET.ParseError:
        print("Error: One or both of the input files are not well-formed XML.")
    except FileNotFoundError:
        print("Error: One or both of the input files could not be found.")
    except Exception as e:
        print("An error occurred:", str(e))

# Use the function
merge_xml('guide.xml', 'tp.guide.xml', 'epg.xml')
