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
				projectiles.erase(projectile)
				node.queue_free()
				if enemy.hp <= 0:
					enemies.erase(enemy)
					kills += 1
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


func show_result() -> void:
	ended = true
	var rating := "Rookie Slacker"
	if elapsed >= 120.0:
		rating = "Office Striker"
	elif elapsed >= 60.0:
		rating = "Bench Hero"
	hud.text = "Run %.0fs  Kicks %d\nRating: %s" % [elapsed, kills, rating]
