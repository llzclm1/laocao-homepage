extends CharacterBody2D

signal died(enemy: Node)

var hp: int = 24
var speed: float = 105.0
var damage: int = 10
var enemy_type: String = "patrol"
var target: Node2D
var radius: float = 18.0


func configure(type_name: String, target_node: Node2D) -> void:
	enemy_type = type_name
	target = target_node
	if enemy_type == "hr":
		hp = 180
		speed = 92.0
		damage = 18
		radius = 24.0
		$Body.color = Color(0.03, 0.04, 0.06, 1)
	elif enemy_type == "boss":
		hp = 1200
		speed = 70.0
		damage = 24
		radius = 42.0
		$Body.color = Color(0.35, 0.39, 0.45, 1)
		$Body.offset_left = -34.0
		$Body.offset_top = -40.0
		$Body.offset_right = 34.0
		$Body.offset_bottom = 40.0
	else:
		hp = 38
		speed = 120.0
		damage = 10
		radius = 18.0
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
