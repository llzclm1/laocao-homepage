extends Node2D

@export var patrol_texture: Texture2D
@export var hr_texture: Texture2D
@export var boss_texture: Texture2D
@export var supervisor_texture: Texture2D
@export var meeting_texture: Texture2D

var hp: int = 24
var speed: float = 105.0
var damage: int = 10
var enemy_type: String = "patrol"
var target: Node2D
var radius: float = 18.0

@onready var body: Sprite2D = $Body


func configure(type_name: String, target_node: Node2D) -> void:
	enemy_type = type_name
	target = target_node
	if enemy_type == "hr":
		hp = 180
		speed = 92.0
		damage = 18
		radius = 24.0
		body.texture = hr_texture
		body.scale = Vector2(0.18, 0.18)
	elif enemy_type == "boss":
		hp = 1200
		speed = 70.0
		damage = 24
		radius = 42.0
		body.texture = boss_texture
		body.scale = Vector2(0.26, 0.26)
	elif enemy_type == "supervisor":
		hp = 72
		speed = 104.0
		damage = 14
		radius = 22.0
		body.texture = supervisor_texture
		body.scale = Vector2(0.17, 0.17)
	elif enemy_type == "meeting":
		hp = 54
		speed = 138.0
		damage = 12
		radius = 20.0
		body.texture = meeting_texture
		body.scale = Vector2(0.2, 0.2)
		body.offset = Vector2(0, -56)
	else:
		hp = 38
		speed = 120.0
		damage = 7
		radius = 18.0
		body.texture = patrol_texture
		body.scale = Vector2(0.16, 0.16)


func take_damage(amount: int) -> void:
	hp -= amount


func _process(delta: float) -> void:
	if not is_instance_valid(target):
		return
	var velocity := (target.global_position - global_position).normalized() * speed
	global_position += velocity * delta
	if abs(velocity.x) > 0.01:
		body.flip_h = velocity.x < 0.0
