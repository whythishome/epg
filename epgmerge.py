import xml.etree.ElementTree as ET

# File paths (input and output)
input_file1 = 'guide.xml'  # Replace with the first EPG file path
input_file2 = 'tp.guide.xml'  # Replace with the second EPG file path
output_file = 'epg.xml'  # Output file path

# Parse the first XML file
tree1 = ET.parse(input_file1)
root1 = tree1.getroot()

# Parse the second XML file
tree2 = ET.parse(input_file2)
root2 = tree2.getroot()

# Ensure that both files have the same root element (e.g., <tv>)
if root1.tag != root2.tag:
    raise ValueError("The root elements of the two XML files do not match!")

# Append all the children from root2 into root1
for element in root2:
    root1.append(element)

# Write the combined tree to a new XML file
tree1.write(output_file, encoding='utf-8', xml_declaration=True)

print(f"Combined EPG XML saved as: {output_file}")
