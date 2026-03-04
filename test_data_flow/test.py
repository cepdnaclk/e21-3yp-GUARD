import paho.mqtt.client as mqtt

def on_message(client, userdata, msg):
    print("Temperature:", msg.payload.decode())

client = mqtt.Client()
client.connect("192.168.1.173", 1883, 60)
client.subscribe("sensor/temperature")

client.on_message = on_message
client.loop_forever()