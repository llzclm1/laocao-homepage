extends CharacterBody2D

@export var speed: float = 330.0

var hp: int = 100
var move_vector: Vector2 = Vector2.ZERO


func set_move_vector(value: Vector2) -> void:
	move_vector = value.limit_length(1.0)


func _physics_process(_delta: float) -> void:
	velocity = move_vector * speed
	move_and_slide()
