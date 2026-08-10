import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('13.235.149.242', username='crm_white', password='Qwerty@123', timeout=10)

command = """
source ~/.nvm/nvm.sh
node -e "console.log(process.env.FIREBASE_DATABASE_URL)"
"""
stdin, stdout, stderr = client.exec_command(command)
print("STDOUT:", stdout.read().decode().strip())
client.close()
