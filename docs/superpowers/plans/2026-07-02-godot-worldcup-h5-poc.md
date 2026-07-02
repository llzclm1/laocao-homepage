# Godot Worldcup H5 POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Godot Web proof of concept for `工位突围：世界杯摸鱼版` at `/game/worldcup-godot/` without replacing the current Canvas H5 game.

**Architecture:** Keep the existing Canvas game at `/game/worldcup/` as the production sharing entry. Add a self-contained Godot project under `godot/worldcup-poc/`, export static Web files into `game/worldcup-godot/`, and add only build/verification glue needed for static hosting. The POC should validate mobile browser load, touch movement, auto-attack combat, simple enemy pressure, one boss, and a result screen.

**Tech Stack:** Godot 4.3+ or 4.4+, GDScript, 2D nodes, static Web export, existing repository static hosting scripts.

---

## File Structure

- Create: `godot/worldcup-poc/project.godot` - Godot project metadata.
- Create: `godot/worldcup-poc/export_presets.cfg` - Web export preset using a single-threaded, browser-friendly configuration.
- Create: `godot/worldcup-poc/scenes/Main.tscn` - main 9:16 game scene.
- Create: `godot/worldcup-poc/scenes/Player.tscn` - player scene.
- Create: `godot/worldcup-poc/scenes/Enemy.tscn` - generic enemy scene configured by type.
- Create: `godot/worldcup-poc/scenes/Projectile.tscn` - football projectile scene.
- Create: `godot/worldcup-poc/scripts/main.gd` - run loop, spawning, random office obstacles, boss, result screen.
- Create: `godot/worldcup-poc/scripts/player.gd` - touch/keyboard movement and player stats.
- Create: `godot/worldcup-poc/scripts/enemy.gd` - enemy movement, damage, and death.
- Create: `godot/worldcup-poc/scripts/projectile.gd` - football movement and hit handling.
- Create: `godot/worldcup-poc/assets/README.md` - asset rules and expected import settings.
- Create: `game/worldcup-godot/README.md` - explains where generated Web export files appear.
- Modify: `scripts/verify-static-hosting.mjs` - verify `/game/worldcup-godot/` when exported files exist.
- Modify: `package.json` - add an optional `verify:godot:web` script if a Godot binary is available.

---

### Task 1: Confirm Godot Tooling And Add Project Shell

**Files:**
- Create: `godot/worldcup-poc/project.godot`
- Create: `godot/worldcup-poc/export_presets.cfg`
- Create: `godot/worldcup-poc/assets/README.md`
- Create: `game/worldcup-godot/README.md`

- [ ] **Step 1: Confirm local Godot binary**

Run:

```bash
command -v godot || command -v godot4 || ls -1 /Applications | rg -i 'godot'
```

Expected:

- If a Godot executable is found, record the path for later export commands.
- If no executable is found, install Godot 4.3+ or 4.4+ before implementation. Do not fake generated Web export files.

- [ ] **Step 2: Create the Godot project metadata**

Create `godot/worldcup-poc/project.godot`:

```ini
config_version=5

[application]
config/name="工位突围世界杯摸鱼版 Godot POC"
run/main_scene="res://scenes/Main.tscn"
config/features=PackedStringArray("4.3", "Mobile")
boot_splash/show_image=false

[display]
window/size/viewport_width=750
window/size/viewport_height=1334
window/stretch/mode="canvas_items"
window/stretch/aspect="keep"

[rendering]
renderer/rendering_method="gl_compatibility"
textures/canvas_textures/default_texture_filter=0
```

- [ ] **Step 3: Create a Web export preset**

Create `godot/worldcup-poc/export_presets.cfg`:

```ini
[preset.0]
name="Web"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path="../../game/worldcup-godot/index.html"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false
script_export_mode=2

[preset.0.options]
custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=true
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
```

- [ ] **Step 4: Add asset guidance**

Create `godot/worldcup-poc/assets/README.md`:

```markdown
# Godot Worldcup POC Assets

Use small PNG assets first. The first POC should prefer simple ColorRect/Polygon2D shapes if importing existing art slows the Web export.

Rules:
- Keep exported Web payload small.
- Use 2D only.
- Do not add C# or GDExtension.
- Do not enable thread support for the Web export.
- Keep the player visually blue so it differs from enemies.
```

- [ ] **Step 5: Add generated export directory note**

Create `game/worldcup-godot/README.md`:

```markdown
# Godot Worldcup H5 POC Export

Generated Godot Web export files go here.

The current production Canvas game remains at `/game/worldcup/`.
This directory is only for validating whether a Godot Web version is viable for mobile H5.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add godot/worldcup-poc/project.godot godot/worldcup-poc/export_presets.cfg godot/worldcup-poc/assets/README.md game/worldcup-godot/README.md
git commit -m "chore: scaffold godot worldcup h5 poc"
```

Expected: commit succeeds.

---

### Task 2: Build The Minimal Playable Godot Scene

**Files:**
- Create: `godot/worldcup-poc/scenes/Main.tscn`
- Create: `godot/worldcup-poc/scenes/Player.tscn`
- Create: `godot/worldcup-poc/scenes/Enemy.tscn`
- Create: `godot/worldcup-poc/scenes/Projectile.tscn`
- Create: `godot/worldcup-poc/scripts/main.gd`
- Create: `godot/worldcup-poc/scripts/player.gd`
- Create: `godot/worldcup-poc/scripts/enemy.gd`
- Create: `godot/worldcup-poc/scripts/projectile.gd`

- [ ] **Step 1: Create `Player.tscn`**

Create `godot/worldcup-poc/scenes/Player.tscn`:

```ini
[gd_scene load_steps=2 format=3 uid="uid://worldcup_player_poc"]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1")

[node name="Body" type="ColorRect" parent="."]
offset_left = -18.0
offset_top = -28.0
offset_right = 18.0
offset_bottom = 28.0
color = Color(0.09, 0.32, 0.77, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
```

- [ ] **Step 2: Create `player.gd`**

Create `godot/worldcup-poc/scripts/player.gd`:

```gdscript
extends CharacterBody2D

@export var speed: float = 330.0
var hp: int = 100
var move_vector: Vector2 = Vector2.ZERO

func set_move_vector(value: Vector2) -> void:
    move_vector = value.limit_length(1.0)

func _physics_process(_delta: float) -> void:
    velocity = move_vector * speed
    move_and_slide()
```

- [ ] **Step 3: Create `Enemy.tscn`**

Create `godot/worldcup-poc/scenes/Enemy.tscn`:

```ini
[gd_scene load_steps=2 format=3 uid="uid://worldcup_enemy_poc"]

[ext_resource type="Script" path="res://scripts/enemy.gd" id="1"]

[node name="Enemy" type="CharacterBody2D"]
script = ExtResource("1")

[node name="Body" type="ColorRect" parent="."]
offset_left = -16.0
offset_top = -16.0
offset_right = 16.0
offset_bottom = 16.0
color = Color(0.12, 0.14, 0.18, 1)
```

- [ ] **Step 4: Create `enemy.gd`**

Create `godot/worldcup-poc/scripts/enemy.gd`:

```gdscript
extends CharacterBody2D

signal died(enemy)

var hp: int = 24
var speed: float = 105.0
var damage: int = 10
var enemy_type: String = "patrol"
var target: Node2D

func configure(type_name: String, target_node: Node2D) -> void:
    enemy_type = type_name
    target = target_node
    if enemy_type == "hr":
        hp = 180
        speed = 92.0
        damage = 18
        $Body.color = Color(0.03, 0.04, 0.06, 1)
    elif enemy_type == "boss":
        hp = 1200
        speed = 70.0
        damage = 24
        $Body.color = Color(0.35, 0.39, 0.45, 1)
        $Body.offset_left = -34.0
        $Body.offset_top = -40.0
        $Body.offset_right = 34.0
        $Body.offset_bottom = 40.0
    else:
        hp = 38
        speed = 120.0
        damage = 10
        $Body.color = Color(0.18, 0.27, 0.43, 1)

func take_damage(amount: int) -> void:
    hp -= amount
    if hp <= 0:
        died.emit(self)
        queue_free()

func _physics_process(_delta: float) -> void:
    if not is_instance_valid(target):
        return
    velocity = (target.global_position - global_position).normalized() * speed
    move_and_slide()
```

- [ ] **Step 5: Create `Projectile.tscn`**

Create `godot/worldcup-poc/scenes/Projectile.tscn`:

```ini
[gd_scene load_steps=2 format=3 uid="uid://worldcup_projectile_poc"]

[ext_resource type="Script" path="res://scripts/projectile.gd" id="1"]

[node name="Projectile" type="Area2D"]
script = ExtResource("1")

[node name="Ball" type="ColorRect" parent="."]
offset_left = -7.0
offset_top = -7.0
offset_right = 7.0
offset_bottom = 7.0
color = Color(1, 1, 1, 1)
```

- [ ] **Step 6: Create `projectile.gd`**

Create `godot/worldcup-poc/scripts/projectile.gd`:

```gdscript
extends Area2D

var velocity: Vector2 = Vector2.ZERO
var damage: int = 22
var life: float = 1.4

func launch(direction: Vector2) -> void:
    velocity = direction.normalized() * 620.0

func _process(delta: float) -> void:
    global_position += velocity * delta
    life -= delta
    if life <= 0:
        queue_free()
```

- [ ] **Step 7: Create `Main.tscn`**

Create `godot/worldcup-poc/scenes/Main.tscn`:

```ini
[gd_scene load_steps=5 format=3 uid="uid://worldcup_main_poc"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1"]
[ext_resource type="PackedScene" path="res://scenes/Player.tscn" id="2"]
[ext_resource type="PackedScene" path="res://scenes/Enemy.tscn" id="3"]
[ext_resource type="PackedScene" path="res://scenes/Projectile.tscn" id="4"]

[node name="Main" type="Node2D"]
script = ExtResource("1")
player_scene = ExtResource("2")
enemy_scene = ExtResource("3")
projectile_scene = ExtResource("4")

[node name="World" type="Node2D" parent="."]

[node name="CanvasLayer" type="CanvasLayer" parent="."]

[node name="Hud" type="Label" parent="CanvasLayer"]
offset_left = 24.0
offset_top = 24.0
offset_right = 500.0
offset_bottom = 110.0
theme_override_font_sizes/font_size = 32
text = "工位突围：世界杯摸鱼版"
```

- [ ] **Step 8: Create `main.gd`**

Create `godot/worldcup-poc/scripts/main.gd`:

```gdscript
extends Node2D

@export var player_scene: PackedScene
@export var enemy_scene: PackedScene
@export var projectile_scene: PackedScene

const WORLD_SIZE := Vector2(1600, 2400)
const RUN_SECONDS := 150.0

var player: CharacterBody2D
var elapsed := 0.0
var spawn_timer := 0.0
var shoot_timer := 0.0
var boss_spawned := false
var kills := 0
var obstacles: Array[ColorRect] = []

@onready var world := $World
@onready var hud := $CanvasLayer/Hud

func _ready() -> void:
    randomize()
    build_office()
    player = player_scene.instantiate()
    world.add_child(player)
    player.global_position = WORLD_SIZE * 0.5

func _process(delta: float) -> void:
    elapsed += delta
    handle_input()
    spawn_timer -= delta
    shoot_timer -= delta
    if spawn_timer <= 0.0:
        spawn_enemy("patrol")
        spawn_timer = max(0.26, 0.9 - elapsed / 240.0)
    if not boss_spawned and elapsed >= 95.0:
        boss_spawned = true
        spawn_enemy("boss")
    if shoot_timer <= 0.0:
        shoot_nearest_enemy()
        shoot_timer = 0.42
    hud.text = "摸鱼 %.0f 秒  击退 %d  HP %d" % [elapsed, kills, player.hp]
    if player.hp <= 0 or elapsed >= RUN_SECONDS:
        show_result()

func handle_input() -> void:
    var axis := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        axis = (get_global_mouse_position() - player.global_position).normalized()
    player.set_move_vector(axis)
    player.global_position.x = clamp(player.global_position.x, 40, WORLD_SIZE.x - 40)
    player.global_position.y = clamp(player.global_position.y, 40, WORLD_SIZE.y - 40)

func build_office() -> void:
    var floor := ColorRect.new()
    floor.color = Color(0.82, 0.79, 0.70, 1)
    floor.size = WORLD_SIZE
    world.add_child(floor)
    var templates := [
        [Vector4(160, 260, 280, 90), Vector4(720, 420, 240, 100), Vector4(1180, 680, 260, 120), Vector4(280, 1480, 320, 110), Vector4(980, 1720, 260, 120)],
        [Vector4(260, 520, 330, 120), Vector4(980, 300, 240, 110), Vector4(1120, 1040, 320, 110), Vector4(160, 1700, 260, 120), Vector4(900, 1980, 360, 120)],
        [Vector4(180, 340, 240, 110), Vector4(1040, 480, 340, 130), Vector4(340, 1080, 300, 110), Vector4(1040, 1500, 260, 120), Vector4(360, 2060, 340, 120)]
    ]
    var chosen: Array = templates.pick_random()
    for item in chosen:
        var rect := ColorRect.new()
        rect.position = Vector2(item.x + randf_range(-70, 70), item.y + randf_range(-70, 70))
        rect.size = Vector2(item.z, item.w)
        rect.color = Color(0.44, 0.32, 0.22, 1)
        world.add_child(rect)
        obstacles.append(rect)

func spawn_enemy(type_name: String) -> void:
    var enemy = enemy_scene.instantiate()
    world.add_child(enemy)
    enemy.global_position = random_spawn_point()
    enemy.configure(type_name, player)
    enemy.died.connect(_on_enemy_died)

func random_spawn_point() -> Vector2:
    var side := randi_range(0, 3)
    if side == 0:
        return Vector2(randf_range(0, WORLD_SIZE.x), 20)
    if side == 1:
        return Vector2(WORLD_SIZE.x - 20, randf_range(0, WORLD_SIZE.y))
    if side == 2:
        return Vector2(randf_range(0, WORLD_SIZE.x), WORLD_SIZE.y - 20)
    return Vector2(20, randf_range(0, WORLD_SIZE.y))

func shoot_nearest_enemy() -> void:
    var nearest: Node2D
    var best := INF
    for child in world.get_children():
        if child.has_method("take_damage"):
            var distance := player.global_position.distance_squared_to(child.global_position)
            if distance < best:
                best = distance
                nearest = child
    if nearest == null:
        return
    var projectile = projectile_scene.instantiate()
    world.add_child(projectile)
    projectile.global_position = player.global_position
    projectile.launch(nearest.global_position - player.global_position)
    projectile.area_entered.connect(func(area): pass)
    projectile.body_entered.connect(func(body):
        if body.has_method("take_damage"):
            body.take_damage(projectile.damage)
            projectile.queue_free()
    )

func _on_enemy_died(_enemy: Node) -> void:
    kills += 1

func show_result() -> void:
    get_tree().paused = true
    hud.text = "本次摸鱼 %.0f 秒，击退 %d 个干扰" % [elapsed, kills]
```

- [ ] **Step 9: Run the project in Godot**

Run from repo root, replacing `/path/to/godot` with the discovered binary:

```bash
/path/to/godot --path godot/worldcup-poc --headless --quit-after 2
```

Expected: Godot starts without script parse errors.

- [ ] **Step 10: Commit**

Run:

```bash
git add godot/worldcup-poc/scenes godot/worldcup-poc/scripts
git commit -m "feat: add godot worldcup playable poc"
```

Expected: commit succeeds.

---

### Task 3: Export Static Web Build

**Files:**
- Generate: `game/worldcup-godot/index.html`
- Generate: `game/worldcup-godot/index.js`
- Generate: `game/worldcup-godot/index.wasm`
- Generate: `game/worldcup-godot/index.pck`
- Modify: `scripts/verify-static-hosting.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add optional package scripts**

Modify `package.json` so scripts include:

```json
{
  "scripts": {
    "build": "node scripts/build-static-site.mjs",
    "build:github": "PUBLIC_BASE_PATH=/laocao-homepage/ node scripts/build-static-site.mjs",
    "build:prod": "SITE_URL=https://gewuji.dev PUBLIC_BASE_PATH=/ node scripts/build-static-site.mjs",
    "verify:static": "node scripts/verify-static-hosting.mjs",
    "verify:godot:web": "test -f game/worldcup-godot/index.html && test -f game/worldcup-godot/index.wasm && test -f game/worldcup-godot/index.pck",
    "submit:indexnow": "node scripts/submit-indexnow.mjs"
  }
}
```

- [ ] **Step 2: Export with Godot**

Run from repo root:

```bash
mkdir -p game/worldcup-godot
/path/to/godot --headless --path godot/worldcup-poc --export-release Web ../../game/worldcup-godot/index.html
```

Expected:

- `game/worldcup-godot/index.html` exists.
- `game/worldcup-godot/index.wasm` exists.
- `game/worldcup-godot/index.pck` exists.

- [ ] **Step 3: Update static verification**

Modify `scripts/verify-static-hosting.mjs` by adding this after the current worldcup checks:

```js
const godotExport = path.join(dist, "game", "worldcup-godot", "index.html");
if (fs.existsSync(godotExport)) {
  const godot = fs.readFileSync(godotExport, "utf8");
  assert.equal(godot.includes(githubPagesHostSuffix), false, "godot web export should not hard-code GitHub Pages");
  assert.ok(fs.existsSync(path.join(dist, "game", "worldcup-godot", "index.wasm")), "godot wasm export is missing");
  assert.ok(fs.existsSync(path.join(dist, "game", "worldcup-godot", "index.pck")), "godot pck export is missing");
}
```

- [ ] **Step 4: Verify local static build**

Run:

```bash
npm run verify:godot:web
npm run build:prod
npm run verify:static
npm run build:github
npm run verify:static
npm run build:prod
npm run verify:static
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json scripts/verify-static-hosting.mjs game/worldcup-godot
git commit -m "feat: export godot worldcup h5 poc"
```

Expected: commit succeeds. If generated Web export files are too large for the repository, stop and report file sizes before committing.

---

### Task 4: Browser Smoke Test And Homepage Link Decision

**Files:**
- Modify only if approved after testing: `index.html`

- [ ] **Step 1: Start local static server**

Run:

```bash
python3 -m http.server 8765
```

Expected: server starts at `http://127.0.0.1:8765/`.

- [ ] **Step 2: Test Godot export in desktop browser**

Open:

```text
http://127.0.0.1:8765/game/worldcup-godot/
```

Expected:

- Godot loading screen completes.
- The scene appears.
- Keyboard movement works.
- Enemies spawn.
- No hard browser console errors.

- [ ] **Step 3: Test mobile viewport**

Use browser devtools or Playwright against:

```text
http://127.0.0.1:8765/game/worldcup-godot/
```

Expected:

- 390x844 viewport renders without horizontal page scrolling.
- Tap/drag movement is usable.
- First load is not obviously too slow.

- [ ] **Step 4: Decide whether to link from homepage**

If the POC passes the smoke tests, add a low-risk secondary link near the existing World Cup banner:

```html
<a class="event-link" href="game/worldcup-godot/">Godot 试玩版 →</a>
```

If the POC is slow or unreliable, do not link it from the homepage. Keep it accessible only by direct URL.

- [ ] **Step 5: Final verification**

Run:

```bash
npm run build:prod
npm run verify:static
```

Expected: static hosting audit passes.

- [ ] **Step 6: Commit and push**

Run:

```bash
git add index.html package.json scripts/verify-static-hosting.mjs game/worldcup-godot godot/worldcup-poc
git commit -m "feat: add godot worldcup h5 trial entry"
git push origin main
```

Expected: push succeeds. If no homepage link was added, use commit message:

```bash
git commit -m "chore: verify godot worldcup h5 poc"
```

---

## Self-Review

- Spec coverage: The plan keeps the current Canvas game intact, creates a separate Godot project, exports to `/game/worldcup-godot/`, and includes mobile H5 verification.
- Completion scan: No `TBD` or open-ended implementation gaps remain. The only variable is the local Godot binary path, which must be discovered in Task 1.
- Scope check: The POC intentionally omits full skill trees, full three-floor progression, login, rankings, sharing, and complex assets.
- Deployment risk: Generated Godot Web files may be large. Task 3 requires checking size before committing if that becomes a problem.
