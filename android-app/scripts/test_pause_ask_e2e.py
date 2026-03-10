#!/usr/bin/env python3
"""
E2E test for Bayit+ Android: Pause-and-Ask / VOD Character Interaction feature.

Tests the complete user-facing flow:
  Home → VOD tab → content item → player → "Ask a Character" button
  → character selection → dialogue overlay → question → response

FINDINGS documented inline where behaviour diverges from the
PauseAskDialogueOverlay implementation in the codebase.

Usage:
    python3 scripts/test_pause_ask_e2e.py [--serial emulator-5554]

Requires: uiautomator2 (pip install uiautomator2), adb in PATH
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

SCREENSHOTS_DIR = Path("/tmp/bayit_pause_ask_test")
APP_PACKAGE = "tv.bayit.plus"
APP_ACTIVITY = "tv.bayit.plus.MainActivity"


def adb(serial: str, *args: str, timeout: int = 30) -> str:
    cmd = ["adb", "-s", serial] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip()


def screenshot(device, serial: str, name: str) -> Path:
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    path = SCREENSHOTS_DIR / f"{name}.png"
    device.screenshot(str(path))
    # Compress to stay under 2000KB per user preference
    subprocess.run(
        ["sips", "-Z", "1200", str(path), "--out", str(path)],
        capture_output=True,
    )
    print(f"  [screenshot] {path}")
    return path


def dump_hierarchy(serial: str) -> str:
    adb(serial, "shell", "uiautomator", "dump", "/sdcard/ui.xml")
    result = subprocess.run(
        ["adb", "-s", serial, "shell", "cat", "/sdcard/ui.xml"],
        capture_output=True, text=True, timeout=30,
    )
    return result.stdout


def find_element_by_text(hierarchy: str, text: str) -> bool:
    return f'text="{text}"' in hierarchy or f"text='{text}'" in hierarchy


def find_element_by_desc(hierarchy: str, desc: str) -> bool:
    return f'content-desc="{desc}"' in hierarchy or f"content-desc='{desc}'" in hierarchy


def log(step: str, msg: str) -> None:
    print(f"\n{'='*60}")
    print(f"STEP {step}: {msg}")
    print(f"{'='*60}")


def assert_true(condition: bool, msg: str) -> None:
    if condition:
        print(f"  PASS: {msg}")
    else:
        print(f"  FAIL: {msg}")


def run_test(serial: str) -> dict:
    import uiautomator2 as u2

    results = {
        "app_launched": False,
        "home_screen_visible": False,
        "vod_tab_navigated": False,
        "content_tapped": False,
        "player_entered": False,
        "interact_button_found": False,
        "interact_triggered": False,
        "character_sheet_visible": False,
        "pause_ask_overlay_visible": False,
        "dialogue_overlay_visible": False,
        "question_sent": False,
        "findings": [],
    }

    d = u2.connect(serial)

    # Disable animations for deterministic tests
    for scale in ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]:
        adb(serial, "shell", "settings", "put", "global", scale, "0")

    # ---------------------------------------------------------------------------
    log("1", "Launch Bayit+ app")
    # ---------------------------------------------------------------------------
    adb(serial, "shell", "am", "start", "-n", f"{APP_PACKAGE}/{APP_ACTIVITY}")
    time.sleep(3)
    screenshot(d, serial, "01_app_launched")

    hierarchy = dump_hierarchy(serial)
    results["app_launched"] = APP_PACKAGE in adb(serial, "shell", "dumpsys", "activity", "activities")
    assert_true(results["app_launched"], "App is in foreground")

    # ---------------------------------------------------------------------------
    log("2", "Verify Home screen")
    # ---------------------------------------------------------------------------
    home_visible = find_element_by_text(hierarchy, "Home") or find_element_by_desc(hierarchy, "Home")
    results["home_screen_visible"] = home_visible
    assert_true(home_visible, "Home tab is visible")
    screenshot(d, serial, "02_home_screen")

    # ---------------------------------------------------------------------------
    log("3", "Navigate to VOD tab")
    # ---------------------------------------------------------------------------
    vod_el = d(text="VOD")
    if not vod_el.exists(timeout=5):
        vod_el = d(description="VOD")
    if vod_el.exists(timeout=5):
        vod_el.click()
        time.sleep(2)
        results["vod_tab_navigated"] = True
        assert_true(True, "VOD tab tapped")
    else:
        print("  WARN: VOD tab not found — trying direct content navigation")
        results["findings"].append("VOD tab not found in bottom nav; layout may differ")

    screenshot(d, serial, "03_vod_tab")

    # ---------------------------------------------------------------------------
    log("4", "Tap on first available VOD content item")
    # ---------------------------------------------------------------------------
    time.sleep(2)
    hierarchy = dump_hierarchy(serial)

    # Try to find a tappable card/content item
    content_tapped = False
    for clickable in d(clickable="true"):
        try:
            info = clickable.info
            bounds = info.get("bounds", {})
            # Skip navigation elements (bottom bar region — typically y > 85% of screen)
            screen_height = int(adb(serial, "shell", "wm", "size").split("x")[-1].strip())
            bottom = bounds.get("bottom", 0) if isinstance(bounds, dict) else 0
            if bottom > screen_height * 0.85:
                continue
            desc = info.get("contentDescription", "") or ""
            text = info.get("text", "") or ""
            if desc or text:
                clickable.click()
                content_tapped = True
                print(f"  Tapped element: '{desc or text}'")
                break
        except Exception:
            continue

    if not content_tapped:
        # Fallback: tap center of screen to see if anything responds
        d.click(540, 800)
        content_tapped = True
        print("  Fallback: tapped center of screen")

    results["content_tapped"] = content_tapped
    time.sleep(3)
    screenshot(d, serial, "04_content_selected")

    # ---------------------------------------------------------------------------
    log("5", "Verify player opened and wait for controls")
    # ---------------------------------------------------------------------------
    time.sleep(2)
    hierarchy = dump_hierarchy(serial)

    # Player is identified by presence of playback controls or video surface
    player_indicators = [
        find_element_by_desc(hierarchy, "Pause"),
        find_element_by_desc(hierarchy, "Play"),
        find_element_by_desc(hierarchy, "Ask a Character"),
        find_element_by_text(hierarchy, "0:00"),
        "ExoPlayer" in hierarchy,
        "VideoView" in hierarchy,
    ]
    results["player_entered"] = any(player_indicators)
    assert_true(results["player_entered"], "Player screen is active")

    if not results["player_entered"]:
        results["findings"].append(
            "Could not enter player from VOD tab — content item click did not navigate to player"
        )
        screenshot(d, serial, "05_player_entry_failed")
        return results

    # Tap the screen to show controls if hidden
    d.click(540, 1000)
    time.sleep(1)
    screenshot(d, serial, "05_player_controls_visible")

    # ---------------------------------------------------------------------------
    log("6", "Find 'Ask a Character' button (RecordVoiceOver icon)")
    # ---------------------------------------------------------------------------
    hierarchy = dump_hierarchy(serial)

    # Button content-desc = "Ask a Character" (player.pauseAsk.title)
    interact_el = d(description="Ask a Character")
    if not interact_el.exists(timeout=3):
        # Also check for the RecordVoiceOver icon by resource ID pattern
        interact_el = d(descriptionContains="Ask")
    if not interact_el.exists(timeout=3):
        # Try 'Ask a Character' as text
        interact_el = d(textContains="Ask a Character")

    results["interact_button_found"] = interact_el.exists(timeout=3)
    assert_true(results["interact_button_found"], "'Ask a Character' button found in player controls")

    if not results["interact_button_found"]:
        results["findings"].append(
            "The 'Ask a Character' button (RecordVoiceOver icon, contentDesc='Ask a Character') "
            "was not found in player controls. It is only shown when hasInteractiveMoments=true "
            "for the content (PlayerControlsOverlay+Bars.kt:144-175)."
        )
        screenshot(d, serial, "06_interact_button_missing")
        return results

    screenshot(d, serial, "06_interact_button_found")

    # ---------------------------------------------------------------------------
    log("7", "Tap 'Ask a Character' and observe result")
    # ---------------------------------------------------------------------------
    interact_el.click()
    time.sleep(3)
    screenshot(d, serial, "07_after_interact_tap")

    hierarchy = dump_hierarchy(serial)
    results["interact_triggered"] = True

    # Check what appeared after tapping:
    # Option A: CharacterSelectionSheet (startVodInteraction → avatar ready path)
    char_sheet_indicators = [
        find_element_by_text(hierarchy, "Select a Character"),
        find_element_by_text(hierarchy, "Cancel"),
    ]
    results["character_sheet_visible"] = any(char_sheet_indicators)

    # Option B: PauseAskDialogueOverlay (startPauseAsk path — currently NOT connected)
    pause_ask_indicators = [
        find_element_by_text(hierarchy, "Who would you like to ask?"),
        find_element_by_text(hierarchy, "Resume Movie"),
        find_element_by_text(hierarchy, "Ask your question..."),
    ]
    results["pause_ask_overlay_visible"] = any(pause_ask_indicators)

    assert_true(results["character_sheet_visible"], "CharacterSelectionSheet appeared (avatar-ready VOD interaction path)")
    assert_true(results["pause_ask_overlay_visible"], "PauseAskDialogueOverlay appeared (pause-ask path)")

    if not results["character_sheet_visible"] and not results["pause_ask_overlay_visible"]:
        results["findings"].append(
            "FINDING: Tapping 'Ask a Character' produced no visible overlay. "
            "startVodInteraction() silently exits when avatar status != 'ready'. "
            "PauseAskDialogueOverlay is NEVER shown because startPauseAsk() is not "
            "connected to any UI element in PlayerScreen.kt or PlayerViewModel+Controls.kt."
        )

    # ---------------------------------------------------------------------------
    log("8", "Character sheet path: select first character")
    # ---------------------------------------------------------------------------
    if results["character_sheet_visible"]:
        screenshot(d, serial, "08_character_sheet")

        # Find the first selectable character (clickable image in the sheet)
        characters = d(clickable="true")
        char_selected = False
        for char in characters:
            try:
                info = char.info
                desc = info.get("contentDescription", "") or ""
                text = info.get("text", "") or ""
                if text in ("Cancel", "Select a Character", ""):
                    continue
                if desc or text:
                    char.click()
                    char_selected = True
                    print(f"  Selected character: '{desc or text}'")
                    break
            except Exception:
                continue

        time.sleep(3)
        screenshot(d, serial, "09_after_character_select")
        hierarchy = dump_hierarchy(serial)

        # Verify dialogue overlay (AvatarDialogueOverlay when session started)
        dialogue_indicators = [
            find_element_by_text(hierarchy, "Type a question..."),
            find_element_by_desc(hierarchy, "Send"),
            find_element_by_text(hierarchy, "Close"),
        ]
        results["dialogue_overlay_visible"] = any(dialogue_indicators)
        assert_true(results["dialogue_overlay_visible"], "AvatarDialogueOverlay appeared after character selection")

        # ---------------------------------------------------------------------------
        log("9", "Send a test question in dialogue overlay")
        # ---------------------------------------------------------------------------
        if results["dialogue_overlay_visible"]:
            question = "What is happening in this scene?"
            input_field = d(text="Type a question...")
            if not input_field.exists(timeout=5):
                input_field = d(className="android.widget.EditText")

            if input_field.exists(timeout=5):
                input_field.set_text(question)
                time.sleep(1)
                screenshot(d, serial, "10_question_typed")

                send_btn = d(description="Send")
                if not send_btn.exists(timeout=3):
                    # Enter key as fallback
                    d.press("enter")
                else:
                    send_btn.click()

                time.sleep(5)
                screenshot(d, serial, "11_after_send")
                results["question_sent"] = True

                hierarchy = dump_hierarchy(serial)
                # Verify response or error state
                response_visible = (
                    find_element_by_text(hierarchy, "Type a question...") or
                    find_element_by_text(hierarchy, "Ask Another Question") or
                    find_element_by_text(hierarchy, "Resume")
                )
                assert_true(response_visible, "Post-send state is visible")
            else:
                results["findings"].append("Could not find input field in dialogue overlay")
        else:
            results["findings"].append(
                "FINDING: Character selection did not open AvatarDialogueOverlay. "
                "This may indicate startSession() failed (no avatarId/profileId) or "
                "the sheet was dismissed without starting a session."
            )
    elif results["pause_ask_overlay_visible"]:
        # If PauseAskDialogueOverlay somehow appeared, test its input panel
        screenshot(d, serial, "08_pause_ask_overlay")

        # Type a question in the PauseAsk input
        input_field = d(text="Ask your question...")
        if not input_field.exists(timeout=5):
            input_field = d(className="android.widget.EditText")

        if input_field.exists(timeout=5):
            input_field.set_text("What is the flux capacitor?")
            time.sleep(1)
            send_btn = d(description="Send")
            if send_btn.exists(timeout=3):
                send_btn.click()
            time.sleep(5)
            results["question_sent"] = True
            screenshot(d, serial, "09_pause_ask_response")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="E2E test for Bayit+ Pause-and-Ask")
    parser.add_argument("--serial", default="emulator-5554", help="ADB device serial")
    args = parser.parse_args()

    serial = args.serial

    # Verify device is available
    devices = subprocess.run(["adb", "devices"], capture_output=True, text=True).stdout
    if serial not in devices:
        print(f"Device {serial} not found. Available devices:\n{devices}")
        sys.exit(1)

    print(f"\nRunning Pause-and-Ask E2E test on {serial}")
    print(f"Screenshots will be saved to {SCREENSHOTS_DIR}\n")

    results = run_test(serial)

    # ---------------------------------------------------------------------------
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    for key, val in results.items():
        if key == "findings":
            continue
        status = "PASS" if val else "FAIL"
        print(f"  [{status}] {key}: {val}")

    if results["findings"]:
        print("\nFINDINGS (action required):")
        for f in results["findings"]:
            print(f"  - {f}")

    print("\nIMPORTANT CODEBASE FINDING:")
    print("  PlayerViewModel.startPauseAsk() is defined in PlayerViewModel+Controls.kt:87")
    print("  but is NOT wired to any UI element.")
    print("  The 'Ask a Character' button (RecordVoiceOver icon) calls startVodInteraction()")
    print("  which shows CharacterSelectionSheet → AvatarDialogueOverlay, NOT")
    print("  PauseAskDialogueOverlay. The full PauseAsk phase flow (SELECTING →")
    print("  INPUT → POLISHING → USER_SPEAKING → TRANSITION → CHARACTER_SPEAKING → IDLE)")
    print("  is implemented but unreachable from the current UI.")

    print(f"\nScreenshots saved to: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    main()
