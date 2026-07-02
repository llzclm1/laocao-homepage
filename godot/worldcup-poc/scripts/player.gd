extends Node2D

@export var speed: float = 330.0
@export var idle_texture: Texture2D
@export var run_texture: Texture2D

var hp: int = 100
var move_vector: Vector2 = Vector2.ZERO

@onready var body: Sprite2D = $Body


func set_move_vector(value: Vector2) -> void:
	move_vector = value.limit_length(1.0)


func _process(delta: float) -> void:
	global_position += move_vector * speed * delta
	body.texture = run_texture if move_vector.length_squared() > 0.01 else idle_texture
	if abs(move_vector.x) > 0.01:
		body.flip_h = move_vector.x < 0.0
