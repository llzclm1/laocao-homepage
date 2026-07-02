extends Node2D

var velocity: Vector2 = Vector2.ZERO
var damage: int = 22
var life: float = 1.4
var hit_radius: float = 18.0


func launch(direction: Vector2) -> void:
	velocity = direction.normalized() * 620.0


func _process(delta: float) -> void:
	global_position += velocity * delta
	life -= delta
	if life <= 0:
		queue_free()
