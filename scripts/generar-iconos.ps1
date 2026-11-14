# Genera los iconos de la app a partir de logo1.png (1536x1024).
# Recorta en cuadrado el emblema (estrellas + amigos + boleto, sin el texto)
# y rellena arriba/abajo estirando la primera/ultima fila, fundida a negro
# y azul noche, para que el fondo degradado siga sin cortes.
# Solo usa .NET (System.Drawing), que viene con Windows: no hace falta
# instalar nada.
#
# Uso (los valores son los de los iconos actuales):
#   powershell -File scripts\generar-iconos.ps1 -Origen logo1.png -Salida iconos -X 308 -Y 0 -Ancho 920 -Alto 650
# y luego copiar:
#   iconos\icono-180.png -> app\apple-icon.png   (icono del iPhone)
#   iconos\icono-192.png -> app\icon.png         (pestaña del navegador)
#   iconos\icono-192.png y icono-512.png -> public\ (manifiesto, Android)
param(
  [string]$Origen, [string]$Salida,
  [int]$X = 368, [int]$Y = 0, [int]$Ancho = 800, [int]$Alto = 640
)
Add-Type -AssemblyName System.Drawing
# El fondo del logo es transparente (alfa 0) pero guarda los colores del
# brillo y del degradado oscuro. Para el icono (iOS no admite transparencia
# y la pinta de negro) se hacen opacos todos los pixeles conservando el
# color, tocando los bytes del propio bitmap cargado (si se copia con
# DrawImage, GDI+ descarta el color de los pixeles transparentes).
$src = [System.Drawing.Bitmap]::FromFile($Origen)
$rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
$datos = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($datos.Stride * $src.Height)
[System.Runtime.InteropServices.Marshal]::Copy($datos.Scan0, $bytes, 0, $bytes.Length)
for ($i = 3; $i -lt $bytes.Length; $i += 4) { $bytes[$i] = 255 }
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $datos.Scan0, $bytes.Length)
$src.UnlockBits($datos)
$lado = $Ancho
$margen = [int](($lado - $Alto) / 2)

$cuadro = New-Object System.Drawing.Bitmap $lado, $lado
$g = [System.Drawing.Graphics]::FromImage($cuadro)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$unidad = [System.Drawing.GraphicsUnit]::Pixel
# Fondo negro debajo: el icono tiene que quedar 100 % opaco
$g.Clear([System.Drawing.Color]::Black)
# Recorte central
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, $margen, $lado, $Alto), (New-Object System.Drawing.Rectangle $X, $Y, $Ancho, $Alto), $unidad)
# Relleno de arriba y de abajo con la fila del borde estirada
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $lado, ($margen + 1)), (New-Object System.Drawing.Rectangle $X, $Y, $Ancho, 1), $unidad)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, ($margen + $Alto - 1), $lado, ($lado - $margen - $Alto + 1)), (New-Object System.Drawing.Rectangle $X, ($Y + $Alto - 1), $Ancho, 1), $unidad)
# Las filas estiradas hacen rayas verticales: se funden con un degradado a
# negro (arriba) y a azul noche (abajo), los colores del fondo del logo.
if ($margen -gt 0) {
  $arriba = New-Object System.Drawing.Rectangle 0, 0, $lado, ($margen + 2)
  $pincel = New-Object System.Drawing.Drawing2D.LinearGradientBrush $arriba, ([System.Drawing.Color]::FromArgb(255, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(0, 0, 0, 0)), 90.0
  $g.FillRectangle($pincel, $arriba); $pincel.Dispose()
  $yAbajo = $margen + $Alto - 2
  $abajo = New-Object System.Drawing.Rectangle 0, $yAbajo, $lado, ($lado - $yAbajo)
  $pincel = New-Object System.Drawing.Drawing2D.LinearGradientBrush $abajo, ([System.Drawing.Color]::FromArgb(0, 4, 10, 40)), ([System.Drawing.Color]::FromArgb(255, 4, 10, 40)), 90.0
  $g.FillRectangle($pincel, $abajo); $pincel.Dispose()
}
$g.Dispose()

New-Item -ItemType Directory -Force $Salida | Out-Null
foreach ($t in 512, 192, 180, 64) {
  $bmp = New-Object System.Drawing.Bitmap $t, $t
  $g2 = [System.Drawing.Graphics]::FromImage($bmp)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g2.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g2.DrawImage($cuadro, 0, 0, $t, $t)
  $g2.Dispose()
  $bmp.Save((Join-Path $Salida "icono-$t.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
$cuadro.Save((Join-Path $Salida "icono-800.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$cuadro.Dispose(); $src.Dispose()
Get-ChildItem $Salida | Select-Object Name, Length
