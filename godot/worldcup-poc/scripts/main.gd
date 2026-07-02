extends Node2D

@export var player_idle_texture: Texture2D
@export var player_run_texture: Texture2D
@export var patrol_texture: Texture2D
@export var hr_texture: Texture2D
@export var boss_texture: Texture2D
@export var supervisor_texture: Texture2D
@export var meeting_texture: Texture2D

const WORLD_SIZE := Vector2(1600, 2400)
const RUN_SECONDS := 150.0
const MAX_ENEMIES := 36
const MAX_PROJECTILES := 24
const MAX_EFFECTS := 60

var player: Sprite2D
var player_hp := 100
var elapsed := 0.0
var spawn_timer := 0.0
var shoot_timer := 0.0
var boss_spawned := false
var ended := false
var kills := 0
var enemies: Array[Dictionary] = []
var projectiles: Array[Dictionary] = []
var effects: Array[Dictionary] = []

@onready var world := $World
@onready var camera := $Camera2D
@onready var hud := $CanvasLayer/Hud


func _ready() -> void:
	randomize()
	build_office()
	player = Sprite2D.new()
	player.texture = player_idle_texture
	player.scale = Vector2(0.18, 0.18)
	player.offset = Vector2(0, -96)
	player.global_position = WORLD_SIZE * 0.5
	world.add_child(player)
	camera.global_position = player.global_position


func _process(delta: float) -> void:
	if ended:
		return
	elapsed += delta
	handle_input(delta)
	update_camera()
	update_spawning(delta)
	update_shooting(delta)
	update_projectiles(delta)
	update_enemies(delta)
	update_effects(delta)
	hud.text = "Time %.0fs  Kicks %d  HP %d" % [elapsed, kills, player_hp]
	if player_hp <= 0 or elapsed >= RUN_SECONDS:
		show_result()


func handle_input(delta: float) -> void:
	var axis := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var drag := get_global_mouse_position() - player.global_position
		if drag.length() > 28.0:
			axis = drag.normalized()
	axis = axis.limit_length(1.0)
	player.global_position += axis * 330.0 * delta
	player.global_position.x = clamp(player.global_position.x, 48.0, WORLD_SIZE.x - 48.0)
	player.global_position.y = clamp(player.global_position.y, 48.0, WORLD_SIZE.y - 48.0)
	player.texture = player_run_texture if axis.length_squared() > 0.01 else player_idle_texture
	if abs(axis.x) > 0.01:
		player.flip_h = axis.x < 0.0


func update_camera() -> void:
	camera.global_position = player.global_position
	camera.global_position.x = clamp(camera.global_position.x, 375.0, WORLD_SIZE.x - 375.0)
	camera.global_position.y = clamp(camera.global_position.y, 667.0, WORLD_SIZE.y - 667.0)


func build_office() -> void:
	var floor := ColorRect.new()
	floor.color = Color(0.78, 0.76, 0.66, 1)
	floor.size = WORLD_SIZE
	world.add_child(floor)
	add_pitch_lines()
	add_office_details()
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
		add_desk_highlight(rect.position, rect.size)


func add_pitch_lines() -> void:
	add_line(Vector2(120, WORLD_SIZE.y * 0.5), Vector2(WORLD_SIZE.x - 120, WORLD_SIZE.y * 0.5), Color(0.87, 0.91, 0.80, 0.45), 5.0)
	add_line(Vector2(WORLD_SIZE.x * 0.5, 120), Vector2(WORLD_SIZE.x * 0.5, WORLD_SIZE.y - 120), Color(0.87, 0.91, 0.80, 0.28), 4.0)
	for angle_index in 24:
		var a := TAU * float(angle_index) / 24.0
		var b := TAU * float(angle_index + 1) / 24.0
		add_line(
			WORLD_SIZE * 0.5 + Vector2(cos(a), sin(a)) * 230.0,
			WORLD_SIZE * 0.5 + Vector2(cos(b), sin(b)) * 230.0,
			Color(0.87, 0.91, 0.80, 0.38),
			4.0
		)
	for y in range(260, int(WORLD_SIZE.y), 360):
		add_line(Vector2(80, y), Vector2(WORLD_SIZE.x - 80, y), Color(0.95, 0.92, 0.82, 0.16), 2.0)


func add_office_details() -> void:
	for i in 18:
		var note := ColorRect.new()
		note.size = Vector2(randf_range(28, 44), randf_range(18, 30))
		note.position = Vector2(randf_range(80, WORLD_SIZE.x - 120), randf_range(120, WORLD_SIZE.y - 160))
		note.color = [Color(0.98, 0.85, 0.36, 0.55), Color(0.38, 0.74, 0.94, 0.42), Color(0.97, 0.55, 0.38, 0.38)].pick_random()
		world.add_child(note)
	for i in 9:
		var label := Label.new()
		label.text = ["VAR", "OFF", "GOAL", "MEET?"].pick_random()
		label.position = Vector2(randf_range(110, WORLD_SIZE.x - 180), randf_range(160, WORLD_SIZE.y - 200))
		label.modulate = Color(0.18, 0.22, 0.28, 0.16)
		label.add_theme_font_size_override("font_size", 38)
		world.add_child(label)


func add_line(from: Vector2, to: Vector2, color: Color, width: float) -> void:
	var line := Line2D.new()
	line.points = PackedVector2Array([from, to])
	line.default_color = color
	line.width = width
	world.add_child(line)


func add_desk_highlight(position: Vector2, size: Vector2) -> void:
	var top := ColorRect.new()
	top.position = position + Vector2(0, -6)
	top.size = Vector2(size.x, 6)
	top.color = Color(0.68, 0.50, 0.34, 0.8)
	world.add_child(top)


func update_spawning(delta: float) -> void:
	if enemies.size() >= MAX_ENEMIES:
		return
	spawn_timer -= delta
	if spawn_timer <= 0.0:
		var type_name := "patrol"
		if elapsed > 70.0 and randf() < 0.18:
			type_name = "hr"
		elif elapsed > 35.0 and randf() < 0.16:
			type_name = "supervisor"
		elif elapsed > 18.0 and randf() < 0.14:
			type_name = "meeting"
		spawn_enemy(type_name)
		spawn_timer = max(0.42, 1.05 - elapsed / 260.0)
	if not boss_spawned and elapsed >= 95.0:
		boss_spawned = true
		spawn_enemy("boss")


func spawn_enemy(type_name: String) -> void:
	var sprite := Sprite2D.new()
	var hp := 38
	var speed := 120.0
	var damage := 7
	var radius := 18.0
	sprite.texture = patrol_texture
	sprite.scale = Vector2(0.16, 0.16)
	sprite.offset = Vector2(0, -92)
	if type_name == "hr":
		hp = 180
		speed = 92.0
		damage = 18
		radius = 24.0
		sprite.texture = hr_texture
		sprite.scale = Vector2(0.18, 0.18)
	elif type_name == "boss":
		hp = 1200
		speed = 70.0
		damage = 24
		radius = 42.0
		sprite.texture = boss_texture
		sprite.scale = Vector2(0.26, 0.26)
	elif type_name == "supervisor":
		hp = 72
		speed = 104.0
		damage = 14
		radius = 22.0
		sprite.texture = supervisor_texture
		sprite.scale = Vector2(0.17, 0.17)
	elif type_name == "meeting":
		hp = 54
		speed = 138.0
		damage = 12
		radius = 20.0
		sprite.texture = meeting_texture
		sprite.scale = Vector2(0.2, 0.2)
		sprite.offset = Vector2(0, -56)
	sprite.global_position = random_spawn_point()
	world.add_child(sprite)
	enemies.append({"node": sprite, "hp": hp, "speed": speed, "damage": damage, "radius": radius})
	spawn_ring(sprite.global_position, Color(0.96, 0.48, 0.16, 0.72))


func random_spawn_point() -> Vector2:
	var side := randi_range(0, 3)
	if side == 0:
		return Vector2(randf_range(0, WORLD_SIZE.x), 20)
	if side == 1:
		return Vector2(WORLD_SIZE.x - 20, randf_range(0, WORLD_SIZE.y))
	if side == 2:
		return Vector2(randf_range(0, WORLD_SIZE.x), WORLD_SIZE.y - 20)
	return Vector2(20, randf_range(0, WORLD_SIZE.y))


func update_shooting(delta: float) -> void:
	shoot_timer -= delta
	if shoot_timer > 0.0 or projectiles.size() >= MAX_PROJECTILES:
		return
	var nearest: Dictionary
	var best := INF
	for enemy in enemies:
		var node: Node2D = enemy.node
		var distance := player.global_position.distance_squared_to(node.global_position)
		if distance < best:
			best = distance
			nearest = enemy
	if nearest.is_empty():
		return
	var ball := ColorRect.new()
	ball.size = Vector2(14, 14)
	ball.position = player.global_position - Vector2(7, 7)
	ball.color = Color(1, 1, 1, 1)
	world.add_child(ball)
	var direction: Vector2 = (nearest.node.global_position - player.global_position).normalized()
	projectiles.append({"node": ball, "velocity": direction * 620.0, "life": 1.4, "damage": 22, "radius": 18.0})
	spawn_trail(player.global_position, Color(1.0, 0.92, 0.28, 0.56))
	shoot_timer = 0.42


func update_projectiles(delta: float) -> void:
	for projectile in projectiles.duplicate():
		var node: ColorRect = projectile.node
		if not is_instance_valid(node):
			projectiles.erase(projectile)
			continue
		node.position += projectile.velocity * delta
		projectile.life -= delta
		if projectile.life <= 0.0:
			projectiles.erase(projectile)
			node.queue_free()
			continue
		for enemy in enemies.duplicate():
			var enemy_node: Node2D = enemy.node
			var radius: float = projectile.radius + enemy.radius
			if node.global_position.distance_squared_to(enemy_node.global_position) <= radius * radius:
				enemy.hp -= projectile.damage
				spawn_hit(enemy_node.global_position)
				projectiles.erase(projectile)
				node.queue_free()
				if enemy.hp <= 0:
					enemies.erase(enemy)
					kills += 1
					spawn_ring(enemy_node.global_position, Color(0.18, 0.72, 0.38, 0.8))
					enemy_node.queue_free()
				break


func update_enemies(delta: float) -> void:
	for enemy in enemies.duplicate():
		var node: Sprite2D = enemy.node
		if not is_instance_valid(node):
			enemies.erase(enemy)
			continue
		var velocity := (player.global_position - node.global_position).normalized() * float(enemy.speed)
		node.global_position += velocity * delta
		if abs(velocity.x) > 0.01:
			node.flip_h = velocity.x < 0.0
		var radius: float = float(enemy.radius) + 22.0
		if player.global_position.distance_squared_to(node.global_position) <= radius * radius:
			player_hp -= int(ceil(float(enemy.damage) * delta))
			if int(elapsed * 10.0) % 6 == 0:
				spawn_trail(player.global_position + Vector2(randf_range(-18, 18), randf_range(-18, 18)), Color(0.95, 0.18, 0.14, 0.42))


func spawn_hit(position: Vector2) -> void:
	for i in 5:
		var spark := ColorRect.new()
		spark.size = Vector2(8, 8)
		spark.position = position + Vector2(randf_range(-16, 16), randf_range(-22, 12))
		spark.color = [Color(1.0, 0.85, 0.12, 0.9), Color(1.0, 0.25, 0.12, 0.75), Color(1.0, 1.0, 1.0, 0.85)].pick_random()
		world.add_child(spark)
		effects.append({"node": spark, "life": 0.28, "velocity": Vector2(randf_range(-90, 90), randf_range(-120, 30)), "fade": true})
	trim_effects()


func spawn_trail(position: Vector2, color: Color) -> void:
	var puff := ColorRect.new()
	puff.size = Vector2(randf_range(14, 24), randf_range(14, 24))
	puff.position = position - puff.size * 0.5
	puff.color = color
	world.add_child(puff)
	effects.append({"node": puff, "life": 0.38, "velocity": Vector2(randf_range(-12, 12), randf_range(-12, 12)), "fade": true})
	trim_effects()


func spawn_ring(position: Vector2, color: Color) -> void:
	for i in 12:
		var a := TAU * float(i) / 12.0
		var dot := ColorRect.new()
		dot.size = Vector2(7, 7)
		dot.position = position + Vector2(cos(a), sin(a)) * 34.0
		dot.color = color
		world.add_child(dot)
		effects.append({"node": dot, "life": 0.45, "velocity": Vector2(cos(a), sin(a)) * 80.0, "fade": true})
	trim_effects()


func update_effects(delta: float) -> void:
	for effect in effects.duplicate():
		var node: ColorRect = effect.node
		if not is_instance_valid(node):
			effects.erase(effect)
			continue
		node.position += effect.velocity * delta
		effect.life -= delta
		if effect.fade:
			node.modulate.a = max(0.0, effect.life / 0.45)
		if effect.life <= 0.0:
			effects.erase(effect)
			node.queue_free()


func trim_effects() -> void:
	while effects.size() > MAX_EFFECTS:
		var effect: Dictionary = effects.pop_front()
		if is_instance_valid(effect.node):
			effect.node.queue_free()


func show_result() -> void:
	ended = true
	var rating := "Rookie Slacker"
	if elapsed >= 120.0:
		rating = "Office Striker"
	elif elapsed >= 60.0:
		rating = "Bench Hero"
	hud.text = "Run %.0fs  Kicks %d\nRating: %s" % [elapsed, kills, rating]
