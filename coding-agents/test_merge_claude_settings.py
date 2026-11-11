"""Contract tests for the curated Claude settings merger."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("merge_claude_settings.py")
SPEC = importlib.util.spec_from_file_location("merge_claude_settings", MODULE_PATH)
assert SPEC and SPEC.loader
merge_claude_settings = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(merge_claude_settings)


class RoleGateTests(unittest.TestCase):
    def test_role_merge_is_switchable_and_off_for_the_terminal_profile(self) -> None:
        root = Path(__file__).resolve().parent.parent / "ansible"
        tasks = (root / "roles" / "coding_agents" / "tasks" / "main.yml").read_text()
        defaults = (root / "roles" / "coding_agents" / "defaults" / "main.yml").read_text()
        terminal = (root / "inventory" / "host_vars" / "terminal.yml").read_text()
        merge_task = tasks.split("- name: Merge curated Claude settings", 1)[1].split("\n- name:", 1)[0]
        self.assertIn("when: claude_settings_merge | bool", merge_task)
        self.assertIn("claude_settings_merge: true", defaults)
        self.assertIn("claude_settings_merge: false", terminal)


class MergeClaudeSettingsTests(unittest.TestCase):
    def write_json(self, path: Path, value: dict) -> None:
        path.write_text(json.dumps(value) + "\n")

    def test_curated_values_override_and_local_values_survive(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shared = root / "shared.json"
            target = root / "settings.json"
            self.write_json(shared, {"model": "fable", "permissions": {"defaultMode": "auto"}})
            self.write_json(target, {"model": "other", "permissions": {"allow": ["Read"]}, "theme": "dark"})

            self.assertTrue(merge_claude_settings.merge(shared, target))

            self.assertEqual(
                json.loads(target.read_text()),
                {"model": "fable", "permissions": {"allow": ["Read"], "defaultMode": "auto"}, "theme": "dark"},
            )

    def test_adrafinil_hooks_are_host_local(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shared = root / "shared.json"
            target = root / "settings.json"
            hooks = {"Stop": [{"hooks": [{"command": "managed-stop"}]}]}
            self.write_json(shared, {"hooks": hooks})
            self.write_json(target, {"hooks": {"Stop": [{"hooks": [{"command": "installer-stop"}]}], "UserPromptSubmit": []}})

            self.assertTrue(merge_claude_settings.merge(shared, target))
            self.assertEqual(json.loads(target.read_text())["hooks"], hooks)

            self.write_json(target, {"hooks": {"Stop": [{"hooks": [{"_adrafinil": True, "command": "adrafinil-release"}]}]}})
            self.assertTrue(merge_claude_settings.merge(shared, target, preserve_adrafinil_hooks=True))
            self.assertEqual(
                json.loads(target.read_text())["hooks"]["Stop"],
                [
                    {"hooks": [{"_adrafinil": True, "command": "adrafinil-release"}]},
                    {"hooks": [{"command": "managed-stop"}]},
                ],
            )
            self.assertFalse(merge_claude_settings.merge(shared, target, preserve_adrafinil_hooks=True))


if __name__ == "__main__":
    unittest.main()
