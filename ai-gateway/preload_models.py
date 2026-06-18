from insightface.app import FaceAnalysis

# Aniq model (640x640)
app1 = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app1.prepare(ctx_id=0, det_size=(640, 640))
print('Accurate model (640x640) yuklandi.')

# Tez model (320x320)
app2 = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app2.prepare(ctx_id=0, det_size=(320, 320))
print('Fast model (320x320) yuklandi.')

print('Barcha modellar tayyor.')
