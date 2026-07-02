extends Node2D

@export var player_scene: PackedScene
@export var enemy_scene: PackedScene
@export var projectile_scene: PackedScene

const WORLD_SIZE := Vector2(1600, 2400)
const RUN_SECONDS := 150.0
const PLAYER_SAFE_RADIUS := 260.0

var player: CharacterBody2D
var elapsed := 0.0
var spawn_timer := 0.0
var shoot_timer := 0.0
var boss_spawned := false
var ended := false
var kills := 0
var obstacles: Array[ColorRect] = []
var enemies: Array[Node2D] = []
var projectiles: Array[Node2D] = []

@onready var world := $World
@onready var camera := $Camera2D
@onready var hud := $CanvasLayer/Hud


func _ready() -> void:
	randomize()
	build_office()
	player = player_scene.instantiate()
	world.add_child(player)
	player.global_position = WORLD_SIZE * 0.5
	camera.global_position = player.global_position


func _process(delta: float) -> void:
	if ended:
		return
	elapsed += delta
	handle_input()
	update_camera()
	update_spawning(delta)
	update_shooting(delta)
	update_projectiles()
	update_enemy_contact(delta)
	hud.text = "Time %.0fs  Kicks %d  HP %d" % [elapsed, kills, player.hp]
	if player.hp <= 0 or elapsed >= RUN_SECONDS:
		show_result()


func handle_input() -> void:
	var axis := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var drag := get_global_mouse_position() - player.global_position
		if drag.length() > 28.0:
			axis = drag.normalized()
	player.set_move_vector(axis)
	player.global_position.x = clamp(player.global_position.x, 48.0, WORLD_SIZE.x - 48.0)
	player.global_position.y = clamp(player.global_position.y, 48.0, WORLD_SIZE.y - 48.0)


func update_camera() -> void:
	camera.global_position = player.global_position
	camera.global_position.x = clamp(camera.global_position.x, 375.0, WORLD_SIZE.x - 375.0)
	camera.global_position.y = clamp(camera.global_position.y, 667.0, WORLD_SIZE.y - 667.0)


func update_spawning(delta: float) -> void:
	spawn_timer -= delta
	if spawn_timer <= 0.0:
		var type_name := "patrol"
		if elapsed > 70.0 and randf() < 0.18:
			type_name = "hr"
		spawn_enemy(type_name)
		spawn_timer = max(0.25, 0.88 - elapsed / 240.0)
	if not boss_spawned and elapsed >= 95.0:
		boss_spawned = true
		spawn_enemy("boss")


func update_shooting(delta: float) -> void:
	shoot_timer -= delta
	if shoot_timer > 0.0:
		return
	shoot_nearest_enemy()
	shoot_timer = 0.42


func update_projectiles() -> void:
	for projectile in projectiles.duplicate():
		if not is_instance_valid(projectile):
			projectiles.erase(projectile)
			continue
		for enemy in enemies.duplicate():
			if not is_instance_valid(enemy):
				enemies.erase(enemy)
				continue
			var radius: float = projectile.hit_radius + enemy.radius
			if projectile.global_position.distance_squared_to(enemy.global_position) <= radius * radius:
				enemy.take_damage(projectile.damage)
				projectile.queue_free()
				projectiles.erase(projectile)
				break


func update_enemy_contact(delta: float) -> void:
	for enemy in enemies.duplicate():
		if not is_instance_valid(enemy):
			enemies.erase(enemy)
			continue
		var radius: float = enemy.radius + 22.0
		if player.global_position.distance_squared_to(enemy.global_position) <= radius * radius:
			player.hp -= int(ceil(enemy.damage * delta))


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
		if rect.position.distance_to(WORLD_SIZE * 0.5) < PLAYER_SAFE_RADIUS:
			rect.position += (rect.position - WORLD_SIZE * 0.5).normalized() * PLAYER_SAFE_RADIUS
		rect.color = Color(0.44, 0.32, 0.22, 1)
		world.add_child(rect)
		obstacles.append(rect)


func spawn_enemy(type_name: String) -> void:
	var enemy = enemy_scene.instantiate()
	world.add_child(enemy)
	enemy.global_position = random_spawn_point()
	enemy.configure(type_name, player)
	enemy.died.connect(_on_enemy_died)
	enemies.append(enemy)


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
	for enemy in enemies:
		if not is_instance_valid(enemy):
			continue
		var distance := player.global_position.distance_squared_to(enemy.global_position)
		if distance < best:
			best = distance
			nearest = enemy
	if nearest == null:
		return
	var projectile = projectile_scene.instantiate()
	world.add_child(projectile)
	projectile.global_position = player.global_position
	projectile.launch(nearest.global_position - player.global_position)
	projectiles.append(projectile)


func _on_enemy_died(enemy: Node) -> void:
	enemies.erase(enemy)
	kills += 1


func show_result() -> void:
	ended = true
	var rating := "Rookie Slacker"
	if elapsed >= 120.0:
		rating = "Office Striker"
	elif elapsed >= 60.0:
		rating = "Bench Hero"
	hud.text = "Run %.0fs  Kicks %d\nRating: %s" % [elapsed, kills, rating]
