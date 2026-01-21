#!/bin/bash
# Clean GCS Movie Folder Names
# Renames messy folder names in Google Cloud Storage

echo "🧹 Cleaning GCS Movie Folders..."
echo "======================================"

# Array of folder renames: "old_name:new_name"
declare -a renames=(
    "1-3-3-8_com_Winnie_the_Pooh_-AMIABLE:Winnie_the_Pooh"
    "25th_Hour_TV_-BoK:25th_Hour"
    "300_p_-hV:300"
    "310_to_Yuma_BOKUTOX:3_10_to_Yuma"
    "65_-_MX:65"
    "ACTION_JACKSON_Rip_-Sample:ACTION_JACKSON"
    "A_Little_Chaos_p:A_Little_Chaos"
    "A_Man_Called_Otto_p_-_MX:A_Man_Called_Otto"
    "Accident_Man_Hitmans_Holiday_p_-_MX:Accident_Man_Hitmans_Holiday"
    "Accidental_Love_Rip_XViD-juggs:Accidental_Love"
    "Ad_Astra_Rip_XviD_-EVO:Ad_Astra"
    "Adele_Live_At_The_Royal_Albert_Hall_p:Adele_Live_At_The_Royal_Albert_Hall"
    "Adormidera_p:Adormidera"
    "Against_The_Ice_p_-_MX:Against_The_Ice"
    "Air_p_-_MX:Air"
    "Aladdin_GAZ:Aladdin"
    "Ambulance_-_MX:Ambulance"
    "American_Beauty_Eng:American_Beauty_English"
    "American_Underdog_-_MX:American_Underdog"
)

count=0
total=${#renames[@]}

for rename in "${renames[@]}"; do
    IFS=':' read -r old new <<< "$rename"

    ((count++))
    echo ""
    echo "[$count/$total] $old"
    echo "      → $new"

    # Move using gsutil
    gsutil -m mv "gs://bayit-plus-media-new/movies/$old" "gs://bayit-plus-media-new/movies/$new" 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
    fi
done

echo ""
echo "======================================"
echo "✅ Cleanup complete! Renamed $count folders"
