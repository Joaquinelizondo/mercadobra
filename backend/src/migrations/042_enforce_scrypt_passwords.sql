-- S5: Eliminar el camino de contraseñas en texto plano heredadas
-- Actualiza contraseñas conocidas de cuentas de prueba/semilla a hashes scrypt
UPDATE users
  SET password = 'scrypt$0b46df9739952a5ccac78c62db3d3519$4a80aeac608e22d89d7374f1fadbe497209ffd099a2c979863d38570318a317087ebcceb2d8d09cfacaedd9b8ee4bd7ab8f98cb7e8986d9e1be4abcd0e7221e0'
  WHERE password = '123456';

UPDATE users
  SET password = 'scrypt$a45998b0ef7fdae091d5fda8db93272a$364fa8a63f457f72ff8bd574128707ff844c5b6472173ee01c87a95f1ebb47e93e7094b6cf6b91c16980d5e3a8cec4c6a28d68248d16d1a68361d46227cb36f1'
  WHERE password = 'admin123';

UPDATE users
  SET password = 'scrypt$b6e02614cb4be125af3e47bf3193228a$b3ccddadba1b791ebc3c6889b0ad927f22db1e436f26e895114efa89a5041e3dbf4f4ada774e32547b324e02ce1280d4a5dc7c6a899838b05df79c4d2fc3088b'
  WHERE password = 'cliente123';

UPDATE users
  SET password = 'scrypt$8bd93f0dc6815cae6f6562d25c6f2b8b$5e939a29c953e1163090fe4de26de830bd5bf2a128bbf548944c9104ad7c397ecedd576921d7bfc525281ca3e69733ce3224d0c4947cd177c54e54cbadc099b9'
  WHERE password = 'pro123';

-- Invalida cualquier otra contraseña que no cumpla con el formato scrypt
UPDATE users
  SET password = 'scrypt$disabled$disabled'
  WHERE password NOT LIKE 'scrypt$%';
