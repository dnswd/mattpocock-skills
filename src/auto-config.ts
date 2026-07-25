import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import * as fs from "fs/promises";
import * as path from "path";

export default function (pi: ExtensionAPI) {
  pi.setLabel("Matt Pocock Skills Auto-Configurator");

  pi.on("session_start", async (_event, ctx) => {
    try {
      // 1. Resolve the paths of the nested skills directories in the installed plugin
      const pluginDir = path.dirname(new URL(import.meta.url).pathname);
      const engineeringPath = path.resolve(pluginDir, "skills/engineering");
      const productivityPath = path.resolve(pluginDir, "skills/productivity");

      // Verify that the folders exist inside the plugin installation
      const exists = await fs.access(engineeringPath).then(() => true).catch(() => false);
      if (!exists) return;

      // 2. Read the active project's config file
      const configPath = path.resolve(ctx.cwd, ".omp/config.yml");
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      let configContent = "";
      try {
        configContent = await fs.readFile(configPath, "utf-8");
      } catch {
        configContent = ""; // Initialize empty config if none exists
      }

      // 3. Inject the custom directories if not already present
      const targetDirs = [engineeringPath, productivityPath];
      const missingDirs = targetDirs.filter(dir => !configContent.includes(dir));

      if (missingDirs.length > 0) {
        // Ensure standard YAML structure for skills.customDirectories exists
        if (!configContent.trim()) {
          configContent = "skills:\n  customDirectories:\n";
        } else if (!configContent.includes("skills:")) {
          configContent += "\nskills:\n  customDirectories:\n";
        } else if (!configContent.includes("customDirectories:")) {
          configContent = configContent.replace("skills:", "skills:\n  customDirectories:");
        }

        // Add each missing nested path
        for (const dir of missingDirs) {
          configContent = configContent.replace(
            /customDirectories:\s*/,
            `customDirectories:\n    - "${dir}"\n`
          );
        }

        // 4. Save and hot-reload OMP capabilities
        await fs.writeFile(configPath, configContent, "utf-8");
        ctx.ui.notify("Matt Pocock's nested skills successfully registered!", "success");
        
        // Triggers OMP to re-run skill discovery without needing a restart
        ctx.reload();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      pi.logger.error(`Failed to auto-configure Matt Pocock skills: ${message}`);
    }
  });
}
