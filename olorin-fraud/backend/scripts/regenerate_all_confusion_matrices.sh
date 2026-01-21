#!/bin/bash
# Script to regenerate confusion matrices for all 50 investigations
# with the updated GMV window financial calculation fix

cd /Users/olorin/Documents/olorin/olorin-server

INVESTIGATION_IDS=(
    "auto-comp-0cb07242048a" "auto-comp-17127155bd9f" "auto-comp-1bf9f75982f6"
    "auto-comp-2165bd6d8cee" "auto-comp-22f8f35b1d91" "auto-comp-2386dfd7eca9"
    "auto-comp-2698f10fddef" "auto-comp-322cd7e5cfe4" "auto-comp-33014fddbb7a"
    "auto-comp-3a1b0680d42c" "auto-comp-3bbeb769f046" "auto-comp-41cacdbf2874"
    "auto-comp-43cd7013dadd" "auto-comp-4596d70ae646" "auto-comp-4822067c954c"
    "auto-comp-56007f9906d0" "auto-comp-58aa60260eeb" "auto-comp-5f85b7d1e19f"
    "auto-comp-6613aec580d5" "auto-comp-6e6a7ef7fbb7" "auto-comp-7862c042998b"
    "auto-comp-84e00066c21f" "auto-comp-8b0378239401" "auto-comp-8c8076144cb0"
    "auto-comp-909451a08bc7" "auto-comp-972872140821" "auto-comp-98a08623fcd8"
    "auto-comp-9f450547c3f6" "auto-comp-a40d0bc18222" "auto-comp-a92f53620778"
    "auto-comp-a9a2fccb2c44" "auto-comp-ab2511446bce" "auto-comp-ad8337b98abd"
    "auto-comp-b8b2facab2a2" "auto-comp-bbec276b1ab8" "auto-comp-bd0609a363ad"
    "auto-comp-c2b3de6e03e4" "auto-comp-c3f55a668dea" "auto-comp-cfd9cea602e5"
    "auto-comp-d50a118c64b2" "auto-comp-d6d07eaf5c30" "auto-comp-e7a3524d2f38"
    "auto-comp-e927cfee82ab" "auto-comp-eb6288e1f008" "auto-comp-eba381c6433b"
    "auto-comp-ecf3c361c05d" "auto-comp-f15faf1a2c18" "auto-comp-f354cbbda611"
    "auto-comp-f3ea7e5cef8d" "auto-comp-ff9b078fb7e3"
)

TOTAL=${#INVESTIGATION_IDS[@]}
SUCCESS=0
FAILED=0
FAILED_IDS=""

echo "=========================================="
echo "Regenerating Confusion Matrices"
echo "Total investigations: $TOTAL"
echo "Started at: $(date)"
echo "=========================================="

for i in "${!INVESTIGATION_IDS[@]}"; do
    INV_ID="${INVESTIGATION_IDS[$i]}"
    NUM=$((i + 1))

    printf "[%02d/%02d] Processing %s... " "$NUM" "$TOTAL" "$INV_ID"

    if poetry run python scripts/generate_confusion_table_for_investigation.py "$INV_ID" > /dev/null 2>&1; then
        echo "SUCCESS"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
        FAILED_IDS="$FAILED_IDS $INV_ID"
    fi
done

echo ""
echo "=========================================="
echo "SUMMARY"
echo "Completed at: $(date)"
echo "Success: $SUCCESS / $TOTAL"
echo "Failed: $FAILED / $TOTAL"
if [ -n "$FAILED_IDS" ]; then
    echo "Failed IDs:$FAILED_IDS"
fi
echo "=========================================="
