param(
  [ValidateSet("non-fullscreen", "fullscreen", "tab-switch-or-reopen")]
  [string]$State = "non-fullscreen",

  [switch]$ExerciseSubmenus,

  [switch]$ExerciseLeafPages,

  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -Namespace SidePanelProof -Name NativeMouse -MemberDefinition @"
  [System.Runtime.InteropServices.DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);

  [System.Runtime.InteropServices.DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, System.UIntPtr dwExtraInfo);

  [System.Runtime.InteropServices.DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(System.IntPtr hWnd);
"@

if (-not $OutDir.Trim()) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutDir = Join-Path $env:TEMP "checkin-checkout-actual-chrome-sidepanel-$stamp"
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

if ($State -ne "non-fullscreen") {
  throw "Actual Chrome side-panel proof state '$State' is not implemented by this UIA probe. Do not relabel the current Chrome layout as fullscreen or tab-switch-or-reopen proof."
}

function Convert-Rect($rect) {
  if (-not [double]::IsFinite($rect.X) -or -not [double]::IsFinite($rect.Width) -or $rect.Width -le 0 -or $rect.Height -le 0) {
    return $null
  }
  [pscustomobject]@{
    left = [math]::Round($rect.X, 2)
    top = [math]::Round($rect.Y, 2)
    right = [math]::Round($rect.X + $rect.Width, 2)
    bottom = [math]::Round($rect.Y + $rect.Height, 2)
    width = [math]::Round($rect.Width, 2)
    height = [math]::Round($rect.Height, 2)
  }
}

function Convert-RectCssApprox($rect, [double]$scale) {
  if ($null -eq $rect -or $scale -le 0) {
    return $null
  }
  [pscustomobject]@{
    left = [math]::Round($rect.left / $scale, 2)
    top = [math]::Round($rect.top / $scale, 2)
    right = [math]::Round($rect.right / $scale, 2)
    bottom = [math]::Round($rect.bottom / $scale, 2)
    width = [math]::Round($rect.width / $scale, 2)
    height = [math]::Round($rect.height / $scale, 2)
  }
}

function Add-UiNode($list, $element, [int]$depth) {
  $rect = Convert-Rect $element.Current.BoundingRectangle
  $type = $element.Current.ControlType.ProgrammaticName -replace "^ControlType\.", ""
  $list.Add([pscustomobject]@{
    element = $element
    depth = $depth
    type = $type
    name = $element.Current.Name
    class = $element.Current.ClassName
    rect = $rect
  }) | Out-Null
}

$chrome = Get-Process chrome -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Sort-Object StartTime -Descending |
  Select-Object -First 1

if (-not $chrome) {
  throw "No visible Chrome main window was found."
}

$root = [System.Windows.Automation.AutomationElement]::FromHandle($chrome.MainWindowHandle)
if ($null -eq $root) {
  throw "Chrome UI Automation root was not available."
}

$nodes = New-Object System.Collections.Generic.List[object]
$walker = [System.Windows.Automation.TreeWalker]::RawViewWalker

function Walk-UiTree($element, [int]$depth) {
  if ($null -eq $element -or $depth -gt 18) {
    return
  }
  $name = $element.Current.Name
  $class = $element.Current.ClassName
  $type = $element.Current.ControlType.ProgrammaticName -replace "^ControlType\.", ""
  if ($name -or $class -or $type -match "Window|Document|Group|Button|Text|Edit|Pane|List|Menu|Image") {
    Add-UiNode $script:nodes $element $depth
  }
  $child = $script:walker.GetFirstChild($element)
  while ($child) {
    Walk-UiTree $child ($depth + 1)
    $child = $script:walker.GetNextSibling($child)
  }
}

function Refresh-UiTree {
  $script:nodes.Clear()
  Walk-UiTree $script:root 0
}

function Test-ClassToken($node, [string]$token) {
  if ($null -eq $node -or -not $node.class) {
    return $false
  }
  return @($node.class -split "\s+") -contains $token
}

function Find-UiNodeByClassToken([string]$token) {
  $script:nodes |
    Where-Object { (Test-ClassToken $_ $token) -and $null -ne $_.rect } |
    Sort-Object { $_.rect.left } -Descending |
    Select-Object -First 1
}

function Find-UiButtonByName([string]$name) {
  $script:nodes |
    Where-Object { $_.type -eq "Button" -and $_.name -eq $name -and $null -ne $_.rect } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1
}

function Get-UiNodeRect {
  param(
    [AllowNull()]
    [object]$node
  )

  if ($null -eq $node) {
    return $null
  }

  try {
    $rectProperty = $node.PSObject.Properties["rect"]
    if ($null -eq $rectProperty) {
      return $null
    }
    return $rectProperty.Value
  } catch {
    return $null
  }
}

function Test-RectInsideBounds($rect, $bounds) {
  if ($null -eq $rect -or $null -eq $bounds) {
    return $false
  }

  return $rect.top -ge ($bounds.visibleTop - 2) -and
    $rect.bottom -le ($bounds.visibleBottom + 2) -and
    $rect.left -ge ($bounds.visibleLeft - 2) -and
    $rect.right -le ($bounds.visibleRight + 2)
}

function Test-RectIntersectsBounds($rect, $bounds) {
  if ($null -eq $rect -or $null -eq $bounds) {
    return $false
  }

  return $rect.right -ge ($bounds.visibleLeft - 2) -and
    $rect.left -le ($bounds.visibleRight + 2) -and
    $rect.bottom -ge ($bounds.visibleTop - 2) -and
    $rect.top -le ($bounds.visibleBottom + 2)
}

function Get-AppShellBounds {
  $appShellNode = Find-UiNodeByClassToken "app-shell"
  if ($null -eq $appShellNode) {
    return $null
  }

  [pscustomobject]@{
    appShell = $appShellNode.rect
    footer = $null
    visibleTop = $appShellNode.rect.top
    visibleBottom = $appShellNode.rect.bottom
    visibleLeft = $appShellNode.rect.left
    visibleRight = $appShellNode.rect.right
  }
}

function Find-UiNodeByVisibleText([string]$label, $bounds = $null) {
  $escaped = [regex]::Escape($label)
  $candidates = @(
    $script:nodes |
      Where-Object {
        $null -ne $_.rect -and
        $_.name -and
        ($_.name -eq $label -or $_.name -eq "$label 메뉴 열기" -or $_.name -match $escaped) -and
        ($null -eq $bounds -or (Test-RectIntersectsBounds $_.rect $bounds))
      }
  )

  $candidates |
    Sort-Object `
      @{ Expression = { if ($_.type -eq "Button") { 0 } elseif ($_.type -eq "Group") { 1 } elseif ($_.type -eq "Text") { 2 } else { 3 } } }, `
      @{ Expression = { $_.rect.top } }, `
      @{ Expression = { $_.rect.left } } |
    Select-Object -First 1
}

function Find-RootMenuButton([string]$label) {
  $ariaName = "$label 메뉴 열기"
  $bounds = Get-VisibleBounds
  $strict = $script:nodes |
    Where-Object {
      $_.type -eq "Button" -and
      $null -ne $_.rect -and
      (Test-ClassToken $_ "home-nav-root-item") -and
      ($_.name -eq $ariaName -or $_.name -eq $label) -and
      ($null -eq $bounds -or (Test-RectInsideBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1

  if ($strict) {
    return $strict
  }

  $buttonFallback = $script:nodes |
    Where-Object {
      $_.type -eq "Button" -and
      $null -ne $_.rect -and
      ($_.name -eq $ariaName -or $_.name -eq $label -or $_.name -match [regex]::Escape($label)) -and
      ($null -eq $bounds -or (Test-RectInsideBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1

  if ($buttonFallback) {
    return $buttonFallback
  }

  return Find-UiNodeByVisibleText $label $bounds
}

function Invoke-UiButton($node) {
  if ($null -eq $node) {
    return $false
  }

  $nodeRect = Get-UiNodeRect $node
  if ($null -eq $nodeRect) {
    return $false
  }

  [SidePanelProof.NativeMouse]::SetForegroundWindow($script:chrome.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 80
  $x = [int][math]::Round(($nodeRect.left + $nodeRect.right) / 2)
  $y = [int][math]::Round(($nodeRect.top + $nodeRect.bottom) / 2)
  [SidePanelProof.NativeMouse]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 40
  [SidePanelProof.NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [SidePanelProof.NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 900
  Refresh-UiTree
  return $true
}

function Find-BackButton {
  $bounds = Get-AppShellBounds
  $script:nodes |
    Where-Object {
      $_.type -eq "Button" -and
      $null -ne $_.rect -and
      ((Test-ClassToken $_ "home-nav-back") -or $_.name -match "뒤로가기") -and
      ($null -eq $bounds -or (Test-RectIntersectsBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1
}

function Return-ToHomeRoot {
  if (Wait-ForHomeRoot 700) {
    return $true
  }

  for ($attempt = 0; $attempt -lt 4; $attempt += 1) {
    if (Wait-ForHomeRoot 700) {
      return $true
    }

    $backButton = Find-BackButton
    if ($null -eq $backButton) {
      $backButton = Find-UiNodeByVisibleText "뒤로가기" (Get-AppShellBounds)
    }

    if (-not (Invoke-UiButton $backButton)) {
      return $false
    }

    if (Wait-ForHomeRoot 1200) {
      return $true
    }
  }

  return Wait-ForHomeRoot 1000
}

function Wait-ForHomeRoot([int]$timeoutMs = 3000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
  $rootLabels = @("고객 서비스 관리", "업무 관리", "템플릿 / 양식 편집")

  do {
    Refresh-UiTree
    $bounds = Get-VisibleBounds
    $missing = @(
      $rootLabels | Where-Object {
        $button = Find-RootMenuButton $_
        $buttonRect = Get-UiNodeRect $button
        -not ($button -and (Test-RectFullyVisibleBeforeFooter $buttonRect $bounds))
      }
    )
    if (@($missing).Count -eq 0) {
      return $true
    }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)

  return $false
}

function Wait-ForRootMenuButtonInBounds([string]$label, [int]$timeoutMs = 3000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
  $lastButton = $null

  do {
    Refresh-UiTree
    $button = Find-RootMenuButton $label
    $lastButton = $button
    $bounds = Get-VisibleBounds
    $buttonRect = Get-UiNodeRect $button
    if ($button -and (Test-RectFullyVisibleBeforeFooter $buttonRect $bounds)) {
      return $button
    }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)

  return $lastButton
}

function Wait-ForSubmenuItems([string[]]$labels, [int]$timeoutMs = 4000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)

  do {
    Refresh-UiTree
    $missing = @($labels | Where-Object { -not (Get-SubmenuItemNode $_) })
    if (@($missing).Count -eq 0) {
      return $true
    }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)

  return $false
}

function Open-RootGroupWithRetry([string]$group, [string[]]$expectedItems, [int]$attempts = 3) {
  $rootOk = $false
  $rootButton = $null
  $rootButtonRect = $null
  $rootButtonFullyVisibleBeforeClick = $false
  $clicked = $false
  $submenuObservedAfterClick = $false

  for ($attempt = 0; $attempt -lt $attempts -and -not $submenuObservedAfterClick; $attempt += 1) {
    $rootOk = Return-ToHomeRoot
    $rootButton = Wait-ForRootMenuButtonInBounds $group 2500
    $rootBounds = Get-VisibleBounds
    $rootButtonRect = Get-UiNodeRect $rootButton
    $rootButtonFullyVisibleBeforeClick =
      $rootButton -and (Test-RectFullyVisibleBeforeFooter $rootButtonRect $rootBounds)
    $clicked = $rootOk -and $rootButtonFullyVisibleBeforeClick -and (Invoke-UiButton $rootButton)
    $submenuObservedAfterClick = if ($clicked) {
      Wait-ForSubmenuItems @($expectedItems) 4500
    } else {
      $false
    }

    if (-not $submenuObservedAfterClick) {
      Start-Sleep -Milliseconds 250
    }
  }

  [pscustomobject]@{
    rootOk = [bool]$rootOk
    rootButton = $rootButton
    rootButtonObserved = [bool]$rootButton
    rootButtonRect = $rootButtonRect
    rootButtonFullyVisibleBeforeClick = [bool]$rootButtonFullyVisibleBeforeClick
    clicked = [bool]$clicked
    submenuObservedAfterClick = [bool]$submenuObservedAfterClick
  }
}

function Get-VisibleBounds {
  $appShellNode = Find-UiNodeByClassToken "app-shell"
  $footerNode = Find-UiNodeByClassToken "home-fixed-bottom-bar"
  if ($null -eq $appShellNode -or $null -eq $footerNode) {
    return $null
  }

  [pscustomobject]@{
    appShell = $appShellNode.rect
    footer = $footerNode.rect
    visibleTop = $appShellNode.rect.top
    visibleBottom = $footerNode.rect.top
    visibleLeft = $appShellNode.rect.left
    visibleRight = $appShellNode.rect.right
  }
}

function Get-StageVisibleBounds {
  $appShellNode = Find-UiNodeByClassToken "app-shell"
  $screenStageNode = Find-UiNodeByClassToken "screen-stage"
  $footerNode = Find-UiNodeByClassToken "home-fixed-bottom-bar"
  if ($null -eq $appShellNode -or $null -eq $footerNode) {
    return $null
  }

  $surfaceNode = if ($screenStageNode) {
    $screenStageNode
  } else {
    $script:nodes |
      Where-Object {
        $null -ne $_.rect -and
        ((Test-ClassToken $_ "home-surface") -or (Test-ClassToken $_ "work-surface") -or (Test-ClassToken $_ "pms-panel")) -and
        (Test-RectIntersectsBounds $_.rect (Get-AppShellBounds))
      } |
      Sort-Object { $_.rect.top }, { $_.rect.left } |
      Select-Object -First 1
  }

  if ($null -eq $surfaceNode) {
    return $null
  }

  $stageRect = if ($screenStageNode) {
    $screenStageNode.rect
  } else {
    [pscustomobject]@{
      left = $appShellNode.rect.left
      top = $surfaceNode.rect.top
      right = $appShellNode.rect.right
      bottom = $footerNode.rect.top
      width = [math]::Round($appShellNode.rect.right - $appShellNode.rect.left, 2)
      height = [math]::Round($footerNode.rect.top - $surfaceNode.rect.top, 2)
    }
  }

  [pscustomobject]@{
    appShell = $appShellNode.rect
    screenStage = $stageRect
    screenStageObserved = [bool]$screenStageNode
    screenStageDerivedFromVisibleSurface = [bool](-not $screenStageNode)
    footer = $footerNode.rect
    visibleTop = [math]::Max($appShellNode.rect.top, $stageRect.top)
    visibleBottom = [math]::Min($stageRect.bottom, $footerNode.rect.top)
    visibleLeft = [math]::Max($appShellNode.rect.left, $stageRect.left)
    visibleRight = [math]::Min($appShellNode.rect.right, $stageRect.right)
  }
}

function Test-RectFullyVisibleBeforeFooter($rect, $bounds) {
  return Test-RectInsideBounds $rect $bounds
}

function Get-SubmenuItemNode([string]$label) {
  $bounds = Get-VisibleBounds
  $strict = $script:nodes |
    Where-Object {
      $_.type -eq "Button" -and
      $null -ne $_.rect -and
      (Test-ClassToken $_ "home-submenu-item") -and
      $_.name -eq $label -and
      ($null -eq $bounds -or (Test-RectInsideBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1

  if ($strict) {
    return $strict
  }

  $buttonFallback = $script:nodes |
    Where-Object {
      $_.type -eq "Button" -and
      $null -ne $_.rect -and
      ($_.name -eq $label -or $_.name -match [regex]::Escape($label)) -and
      ($null -eq $bounds -or (Test-RectInsideBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1

  if ($buttonFallback) {
    return $buttonFallback
  }

  return Find-UiNodeByVisibleText $label $bounds
}

function Find-WorkSurfaceNode([string]$label) {
  $bounds = Get-AppShellBounds
  $strict = $script:nodes |
    Where-Object {
      (Test-ClassToken $_ "work-surface") -and
      $null -ne $_.rect -and
      $_.name -eq $label -and
      ($null -eq $bounds -or (Test-RectIntersectsBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1

  if ($strict) {
    return $strict
  }

  $script:nodes |
    Where-Object {
      (Test-ClassToken $_ "work-surface") -and
      $null -ne $_.rect -and
      ($null -eq $bounds -or (Test-RectIntersectsBounds $_.rect $bounds))
    } |
    Sort-Object { $_.rect.top }, { $_.rect.left } |
    Select-Object -First 1
}

function Wait-ForWorkSurface([string]$label, [string[]]$markers, [int]$timeoutMs = 5000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)

  do {
    Refresh-UiTree
    $surface = Find-WorkSurfaceNode $label
    $appBounds = Get-AppShellBounds
    $missing = @($markers | Where-Object { -not (Find-UiNodeByVisibleText $_ $appBounds) })
    if ($surface -and @($missing).Count -eq 0) {
      return $surface
    }
    Start-Sleep -Milliseconds 150
  } while ([DateTime]::UtcNow -lt $deadline)

  return Find-WorkSurfaceNode $label
}

function Get-ShellContainmentEvidence {
  $appShellNode = Find-UiNodeByClassToken "app-shell"
  $screenStageNode = Find-UiNodeByClassToken "screen-stage"
  $footerNode = Find-UiNodeByClassToken "home-fixed-bottom-bar"
  $stageBounds = Get-StageVisibleBounds
  $footerContained = $appShellNode -and $footerNode -and
    $footerNode.rect.top -ge ($appShellNode.rect.top - 2) -and
    $footerNode.rect.bottom -le ($appShellNode.rect.bottom + 2) -and
    $footerNode.rect.left -ge ($appShellNode.rect.left - 2) -and
    $footerNode.rect.right -le ($appShellNode.rect.right + 2)
  $stageSeparatedFromFooter = $stageBounds -and $footerNode -and
    $stageBounds.visibleBottom -le ($footerNode.rect.top + 2)
  $stageContained = $appShellNode -and $stageBounds -and
    $stageBounds.visibleTop -ge ($appShellNode.rect.top - 2) -and
    $stageBounds.visibleLeft -ge ($appShellNode.rect.left - 2) -and
    $stageBounds.visibleRight -le ($appShellNode.rect.right + 2)

  [pscustomobject]@{
    appShellObserved = [bool]$appShellNode
    screenStageObserved = [bool]$screenStageNode
    screenStageBoundsAvailable = [bool]$stageBounds
    screenStageDerivedFromVisibleSurface = [bool]($stageBounds -and $stageBounds.screenStageDerivedFromVisibleSurface)
    footerObserved = [bool]$footerNode
    screenStageContainedInAppShell = [bool]$stageContained
    screenStageSeparatedFromFooter = [bool]$stageSeparatedFromFooter
    footerContainedInAppShell = [bool]$footerContained
    visibleBounds = $stageBounds
    ok = [bool]($appShellNode -and $stageBounds -and $footerNode -and $stageContained -and $stageSeparatedFromFooter -and $footerContained)
  }
}

function Get-LeafMarkerEvidence([string]$label, [bool]$firstViewportRequired) {
  $stageBounds = Get-StageVisibleBounds
  $searchBounds = if ($stageBounds) { $stageBounds } else { Get-AppShellBounds }
  $node = Find-UiNodeByVisibleText $label $searchBounds
  $rect = Get-UiNodeRect $node
  $visibleInFirstViewport = Test-RectInsideBounds $rect $stageBounds

  [pscustomobject]@{
    marker = $label
    observed = [bool]$node
    rect = $rect
    firstViewportRequired = [bool]$firstViewportRequired
    visibleInFirstViewport = [bool]$visibleInFirstViewport
    ok = [bool](-not $firstViewportRequired -or ($node -and $visibleInFirstViewport))
  }
}

function Wait-ForAnyVisibleText([string[]]$labels, [int]$timeoutMs = 6000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)

  do {
    Refresh-UiTree
    $appBounds = Get-AppShellBounds
    foreach ($label in $labels) {
      $node = Find-UiNodeByVisibleText $label $appBounds
      if ($node) {
        return [pscustomobject]@{
          observed = $true
          label = $label
          rect = Get-UiNodeRect $node
        }
      }
    }
    Start-Sleep -Milliseconds 150
  } while ([DateTime]::UtcNow -lt $deadline)

  [pscustomobject]@{
    observed = $false
    label = ""
    rect = $null
  }
}

function Invoke-OtaFetchAndObserve {
  $stageBounds = Get-StageVisibleBounds
  $button = Find-UiNodeByVisibleText "예약정보 가져오기" $stageBounds
  $buttonRect = Get-UiNodeRect $button
  $buttonVisibleBeforeClick = Test-RectInsideBounds $buttonRect $stageBounds
  $clicked = $buttonVisibleBeforeClick -and (Invoke-UiButton $button)
  $resolution = if ($clicked) {
    Wait-ForAnyVisibleText @(
      "추출된 예약정보",
      "WINGS 예약정보창",
      "올바른 지점 선택",
      "기존 탭을 새로고침",
      "예약정보를 가져오지",
      "지점 또는 탭",
      "Chrome 탭",
      "활성 탭",
      "권한"
    ) 7000
  } else {
    [pscustomobject]@{ observed = $false; label = ""; rect = $null }
  }

  [pscustomobject]@{
    action = "otaFetch"
    buttonObserved = [bool]$button
    buttonRect = $buttonRect
    buttonVisibleBeforeClick = [bool]$buttonVisibleBeforeClick
    clicked = [bool]$clicked
    resolvedAsResultOrError = [bool]$resolution.observed
    observedResolution = $resolution
    ok = [bool]($clicked -and $resolution.observed)
  }
}

function Save-DesktopScreenshot([string]$fileName) {
  $screenBounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $screenshotPath = Join-Path $OutDir $fileName
  $bitmap = New-Object System.Drawing.Bitmap $screenBounds.Width, $screenBounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($screenBounds.Location, [System.Drawing.Point]::Empty, $screenBounds.Size)
  $bitmap.Save($screenshotPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  return $screenshotPath
}

function Test-ActualChromeSubmenus {
  $contracts = @(
    [pscustomobject]@{
      group = "고객 서비스 관리"
      items = @("세탁물 관리", "매지출 관리", "공항밴 관리")
    },
    [pscustomobject]@{
      group = "업무 관리"
      items = @("객실 정보 리마크", "NAVER / STATION 예약입력", "업무보고 양식")
    },
    [pscustomobject]@{
      group = "템플릿 / 양식 편집"
      items = @("안내문 편집 / 빠른답변 편집", "업무 양식 편집")
    }
  )

  $groups = @()
  $rootAvailable = Return-ToHomeRoot

  foreach ($contract in $contracts) {
    $openResult = Open-RootGroupWithRetry $contract.group @($contract.items)
    $rootButton = $openResult.rootButton
    $rootButtonRect = $openResult.rootButtonRect
    $rootButtonFullyVisibleBeforeClick = $openResult.rootButtonFullyVisibleBeforeClick
    $clicked = $openResult.clicked
    $submenuObservedAfterClick = $openResult.submenuObservedAfterClick
    $opened = $clicked -and $submenuObservedAfterClick
    $bounds = Get-VisibleBounds
    $items = @()

    foreach ($itemLabel in $contract.items) {
      $node = Get-SubmenuItemNode $itemLabel
      $nodeRect = Get-UiNodeRect $node
      $items += [pscustomobject]@{
        label = $itemLabel
        observed = [bool]$node
        rect = $nodeRect
        fullyVisibleBeforeFooter = $node -and (Test-RectFullyVisibleBeforeFooter $nodeRect $bounds)
      }
    }

    $groupOk = $opened -and @($items).Count -eq @($contract.items).Count -and
      -not (@($items) | Where-Object { -not $_.observed -or -not $_.fullyVisibleBeforeFooter })

    $groups += [pscustomobject]@{
      group = $contract.group
      opened = [bool]$opened
      rootButtonObserved = [bool]$openResult.rootButtonObserved
      rootButtonRect = $rootButtonRect
      rootButtonFullyVisibleBeforeClick = [bool]$rootButtonFullyVisibleBeforeClick
      clicked = [bool]$clicked
      submenuObservedAfterClick = [bool]$submenuObservedAfterClick
      expectedItems = @($contract.items)
      items = @($items)
      visibleBounds = $bounds
      ok = [bool]$groupOk
    }

    Return-ToHomeRoot | Out-Null
  }

  [pscustomobject]@{
    attempted = $true
    rootAvailable = [bool]$rootAvailable
    groups = @($groups)
    ok = @($groups).Count -eq @($contracts).Count -and -not (@($groups) | Where-Object { -not $_.ok })
  }
}

function Test-ActualChromeLeafPages {
  $contracts = @(
    [pscustomobject]@{
      group = "고객 서비스 관리"
      item = "세탁물 관리"
      submenuItems = @("세탁물 관리", "매지출 관리", "공항밴 관리")
      markers = @("진행 중", "세탁물 추가", "완료")
      firstViewportMarkers = @("진행 중", "세탁물 추가", "완료")
      postAction = ""
    },
    [pscustomobject]@{
      group = "고객 서비스 관리"
      item = "매지출 관리"
      submenuItems = @("세탁물 관리", "매지출 관리", "공항밴 관리")
      markers = @("새 지출", "카테고리", "소모품", "수리", "식음료", "기타", "매지출 보고 복사")
      firstViewportMarkers = @("새 지출", "카테고리", "소모품", "수리", "식음료", "기타")
      postAction = ""
    },
    [pscustomobject]@{
      group = "고객 서비스 관리"
      item = "공항밴 관리"
      submenuItems = @("세탁물 관리", "매지출 관리", "공항밴 관리")
      markers = @("이용 구분", "이동 경로", "탑승 정보", "항공편 정보", "결제수단")
      firstViewportMarkers = @("이용 구분", "이동 경로", "탑승 정보")
      postAction = ""
    },
    [pscustomobject]@{
      group = "업무 관리"
      item = "객실 정보 리마크"
      submenuItems = @("객실 정보 리마크", "NAVER / STATION 예약입력", "업무보고 양식")
      markers = @("객실 선택", "제공 카드키", "대여물품", "추가 리마크")
      firstViewportMarkers = @("객실 선택", "제공 카드키", "대여물품")
      postAction = ""
    },
    [pscustomobject]@{
      group = "업무 관리"
      item = "NAVER / STATION 예약입력"
      submenuItems = @("객실 정보 리마크", "NAVER / STATION 예약입력", "업무보고 양식")
      markers = @("예약정보 추출", "예약정보 가져오기")
      firstViewportMarkers = @("예약정보 추출", "예약정보 가져오기")
      postAction = "otaFetch"
    },
    [pscustomobject]@{
      group = "업무 관리"
      item = "업무보고 양식"
      submenuItems = @("객실 정보 리마크", "NAVER / STATION 예약입력", "업무보고 양식")
      markers = @("업무보고 양식")
      firstViewportMarkers = @("업무보고 양식")
      postAction = ""
    },
    [pscustomobject]@{
      group = "템플릿 / 양식 편집"
      item = "안내문 편집 / 빠른답변 편집"
      submenuItems = @("안내문 편집 / 빠른답변 편집", "업무 양식 편집")
      markers = @("템플릿", "안내문 / 빠른답변 편집", "제목", "본문", "저장하기")
      firstViewportMarkers = @("템플릿", "안내문 / 빠른답변 편집", "제목")
      postAction = ""
    },
    [pscustomobject]@{
      group = "템플릿 / 양식 편집"
      item = "업무 양식 편집"
      submenuItems = @("안내문 편집 / 빠른답변 편집", "업무 양식 편집")
      markers = @("필수 입력값")
      firstViewportMarkers = @("필수 입력값")
      postAction = ""
    }
  )

  $targets = @()
  $rootAvailable = Return-ToHomeRoot
  $index = 0

  foreach ($contract in $contracts) {
    $index += 1
    $openResult = Open-RootGroupWithRetry $contract.group @($contract.submenuItems)
    $rootOk = $openResult.rootOk
    $rootButton = $openResult.rootButton
    $rootButtonRect = $openResult.rootButtonRect
    $rootButtonFullyVisibleBeforeClick = $openResult.rootButtonFullyVisibleBeforeClick
    $groupClicked = $openResult.clicked
    $submenuReady = $openResult.submenuObservedAfterClick

    $itemButton = $null
    $itemRect = $null
    $itemFullyVisibleBeforeClick = $false
    $itemClicked = $false
    $workSurface = $null

    for ($itemAttempt = 0; $itemAttempt -lt 3 -and $submenuReady -and -not $workSurface; $itemAttempt += 1) {
      $itemButton = Get-SubmenuItemNode $contract.item
      $itemRect = Get-UiNodeRect $itemButton
      $itemFullyVisibleBeforeClick = $itemButton -and (Test-RectFullyVisibleBeforeFooter $itemRect (Get-VisibleBounds))
      $itemClicked = $itemFullyVisibleBeforeClick -and (Invoke-UiButton $itemButton)
      $workSurface = if ($itemClicked) {
        Wait-ForWorkSurface $contract.item @($contract.firstViewportMarkers) 6500
      } else {
        $null
      }

      if (-not $workSurface) {
        Start-Sleep -Milliseconds 250
      }
    }

    $shellContainment = Get-ShellContainmentEvidence
    $stageBounds = Get-StageVisibleBounds
    $workSurfaceRect = Get-UiNodeRect $workSurface
    $workSurfaceWholeRectFitsBeforeFooterDiagnostic = Test-RectInsideBounds $workSurfaceRect $stageBounds
    $workSurfaceExtendsBelowViewportDiagnostic = $workSurfaceRect -and $stageBounds -and
      $workSurfaceRect.bottom -gt ($stageBounds.visibleBottom + 2)
    $workSurfaceFrameStartsInStage = $workSurfaceRect -and $stageBounds -and
      $workSurfaceRect.top -ge ($stageBounds.visibleTop - 2) -and
      $workSurfaceRect.left -ge ($stageBounds.visibleLeft - 2) -and
      $workSurfaceRect.right -le ($stageBounds.visibleRight + 2)
    $markerEvidence = @()
    foreach ($marker in $contract.markers) {
      $markerEvidence += Get-LeafMarkerEvidence $marker (@($contract.firstViewportMarkers) -contains $marker)
    }
    $requiredFirstViewportMarkersOk =
      -not (@($markerEvidence) | Where-Object { $_.firstViewportRequired -and -not $_.ok })

    $postActionEvidence = if ($contract.postAction -eq "otaFetch" -and $itemClicked) {
      Invoke-OtaFetchAndObserve
    } else {
      [pscustomobject]@{
        action = $contract.postAction
        notRequired = [string]::IsNullOrWhiteSpace($contract.postAction)
        ok = [string]::IsNullOrWhiteSpace($contract.postAction)
      }
    }

    $screenshotName = "{0:D2}-{1}.png" -f $index, (($contract.item -replace "[\\/:*?`"<>| ]+", "_").Trim("_"))
    $screenshotPath = Save-DesktopScreenshot $screenshotName

    $targetOk = $rootOk -and $rootButtonFullyVisibleBeforeClick -and $groupClicked -and
      $submenuReady -and $itemFullyVisibleBeforeClick -and $itemClicked -and
      [bool]$workSurface -and $shellContainment.ok -and
      $workSurfaceFrameStartsInStage -and $requiredFirstViewportMarkersOk -and
      $postActionEvidence.ok

    $targets += [pscustomobject]@{
      group = $contract.group
      item = $contract.item
      rootOk = [bool]$rootOk
      rootButtonObserved = [bool]$openResult.rootButtonObserved
      rootButtonRect = $rootButtonRect
      rootButtonFullyVisibleBeforeClick = [bool]$rootButtonFullyVisibleBeforeClick
      groupClicked = [bool]$groupClicked
      submenuReady = [bool]$submenuReady
      itemObserved = [bool]$itemButton
      itemRect = $itemRect
      itemFullyVisibleBeforeClick = [bool]$itemFullyVisibleBeforeClick
      itemClicked = [bool]$itemClicked
      workSurfaceReady = [bool]$workSurface
      workSurfaceRect = $workSurfaceRect
      workSurfaceFrameStartsInStage = [bool]$workSurfaceFrameStartsInStage
      requiredFirstViewportMarkersOk = [bool]$requiredFirstViewportMarkersOk
      workSurfaceWholeRectFitsBeforeFooterDiagnostic = [bool]$workSurfaceWholeRectFitsBeforeFooterDiagnostic
      workSurfaceExtendsBelowViewportDiagnostic = [bool]$workSurfaceExtendsBelowViewportDiagnostic
      shellContainment = $shellContainment
      markers = @($markerEvidence)
      postAction = $postActionEvidence
      screenshotPath = $screenshotPath
      ok = [bool]$targetOk
    }

    Return-ToHomeRoot | Out-Null
  }

  [pscustomobject]@{
    attempted = $true
    rootAvailable = [bool]$rootAvailable
    targets = @($targets)
    ok = @($targets).Count -eq @($contracts).Count -and -not (@($targets) | Where-Object { -not $_.ok })
  }
}

Refresh-UiTree

$appShell = $nodes |
  Where-Object { (Test-ClassToken $_ "app-shell") -and $null -ne $_.rect } |
  Sort-Object { $_.rect.left } -Descending |
  Select-Object -First 1
$sidePanelHeader = $nodes |
  Where-Object { $_.class -eq "SidePanelHeader" -and $null -ne $_.rect } |
  Select-Object -First 1
$footer = $nodes |
  Where-Object { (Test-ClassToken $_ "home-fixed-bottom-bar") -and $null -ne $_.rect } |
  Select-Object -First 1
$workSurface = $nodes |
  Where-Object { (Test-ClassToken $_ "work-surface") -and $null -ne $_.rect } |
  Sort-Object { $_.rect.top } |
  Select-Object -First 1
$homeSurface = $nodes |
  Where-Object { (Test-ClassToken $_ "home-surface") -and $null -ne $_.rect } |
  Sort-Object { $_.rect.top } |
  Select-Object -First 1
$screenStage = $nodes |
  Where-Object { (Test-ClassToken $_ "screen-stage") -and $null -ne $_.rect } |
  Select-Object -First 1
$salesCategoryPanel = $nodes |
  Where-Object { (Test-ClassToken $_ "sales-category-panel") -and $null -ne $_.rect } |
  Select-Object -First 1
$categoryChips = $nodes |
  Where-Object { $_.type -eq "Button" -and $_.name -in @("소모품", "수리", "식음료", "기타") -and $null -ne $_.rect } |
  Sort-Object { $_.rect.left }
$bottomButtons = $nodes |
  Where-Object { $_.type -eq "Button" -and $_.name -in @("체크인 목록", "체크아웃 목록", "객실 선택", "설정") -and $null -ne $_.rect } |
  Sort-Object { $_.rect.left }

$windowRect = Convert-Rect $root.Current.BoundingRectangle
$screenBounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$screenshotPath = Save-DesktopScreenshot "desktop.png"

$appShellScale = if ($appShell -and $appShell.rect.width -gt 0) {
  [math]::Round($appShell.rect.width / 400, 4)
} else {
  $null
}

$chipBottom = if (@($categoryChips).Count) {
  (@($categoryChips) | ForEach-Object { $_.rect.bottom } | Measure-Object -Maximum).Maximum
} else {
  $null
}

$submenuExercise = if ($ExerciseSubmenus) {
  Test-ActualChromeSubmenus
} else {
  [pscustomobject]@{
    attempted = $false
    rootAvailable = [bool](Find-RootMenuButton "고객 서비스 관리")
    groups = @()
    ok = $null
  }
}

$leafExercise = if ($ExerciseLeafPages) {
  Test-ActualChromeLeafPages
} else {
  [pscustomobject]@{
    attempted = $false
    rootAvailable = [bool](Find-RootMenuButton "고객 서비스 관리")
    targets = @()
    ok = $null
  }
}

$salesLeafTarget = if ($ExerciseLeafPages) {
  @($leafExercise.targets | Where-Object { $_.item -eq "매지출 관리" } | Select-Object -First 1)
} else {
  @()
}
$salesLeafCategoryChipMarkersVisible = if ($ExerciseLeafPages -and @($salesLeafTarget).Count -gt 0) {
  $requiredSalesChips = @("소모품", "수리", "식음료", "기타")
  -not (@($salesLeafTarget[0].markers) | Where-Object {
      $requiredSalesChips -contains $_.marker -and -not ($_.observed -and $_.visibleInFirstViewport)
    }) -and
    @(@($salesLeafTarget[0].markers) | Where-Object { $requiredSalesChips -contains $_.marker }).Count -eq $requiredSalesChips.Count
} else {
  $null
}
$currentViewCategoryChipsVisibleBeforeFooter = $chipBottom -ne $null -and $footer -and $chipBottom -le ($footer.rect.top + 2)

$proof = [pscustomobject]@{
  source = "windows-uia-real-user-chrome-side-panel-capture"
  scriptCompleted = $true
  state = $State
  capturedAt = (Get-Date).ToString("o")
  chrome = [pscustomobject]@{
    processId = $chrome.Id
    title = $chrome.MainWindowTitle
    windowRect = $windowRect
    primaryScreen = [pscustomobject]@{
      left = $screenBounds.Left
      top = $screenBounds.Top
      width = $screenBounds.Width
      height = $screenBounds.Height
    }
  }
  screenshotPath = $screenshotPath
  appShellScaleFromContractWidth = $appShellScale
  rects = [pscustomobject]@{
    sidePanelHeader = $sidePanelHeader.rect
    appShell = $appShell.rect
    appShellCssApprox = Convert-RectCssApprox $appShell.rect $appShellScale
    screenStage = $screenStage.rect
    homeSurface = $homeSurface.rect
    workSurface = $workSurface.rect
    footer = $footer.rect
    salesCategoryPanel = $salesCategoryPanel.rect
  }
  relativeToAppShell = [pscustomobject]@{
    homeSurfaceTop = if ($appShell -and $homeSurface) { [math]::Round($homeSurface.rect.top - $appShell.rect.top, 2) } else { $null }
    workSurfaceTop = if ($appShell -and $workSurface) { [math]::Round($workSurface.rect.top - $appShell.rect.top, 2) } else { $null }
    footerTop = if ($appShell -and $footer) { [math]::Round($footer.rect.top - $appShell.rect.top, 2) } else { $null }
    salesCategoryTop = if ($appShell -and $salesCategoryPanel) { [math]::Round($salesCategoryPanel.rect.top - $appShell.rect.top, 2) } else { $null }
  }
  checks = [pscustomobject]@{
    appShellObserved = [bool]$appShell
    sidePanelHeaderObserved = [bool]$sidePanelHeader
    footerObserved = [bool]$footer
    bottomButtonsObserved = @($bottomButtons).Count -eq 4
    categoryChipsObserved = if ($ExerciseLeafPages) { [bool]$salesLeafCategoryChipMarkersVisible } else { @($categoryChips).Count -eq 4 }
    appShellWidthMatches400CssAtInferredScale = $appShellScale -ne $null -and [math]::Abs(($appShell.rect.width / $appShellScale) - 400) -le 1
    footerContainedInAppShell = $appShell -and $footer -and $footer.rect.top -ge $appShell.rect.top -and $footer.rect.bottom -le ($appShell.rect.bottom + 2)
    homeSurfaceDoesNotUnderlapFooter = $homeSurface -and $footer -and $homeSurface.rect.bottom -le ($footer.rect.top + 2)
    workSurfaceWholeRectFitsBeforeFooterDiagnostic = $workSurface -and $footer -and $workSurface.rect.bottom -le ($footer.rect.top + 2)
    currentViewCategoryChipsObservedDiagnostic = @($categoryChips).Count -eq 4
    currentViewSalesCategoryChipsVisibleBeforeFooterDiagnostic = $currentViewCategoryChipsVisibleBeforeFooter
    salesCategoryChipsVisibleBeforeFooter = if ($ExerciseLeafPages) { [bool]$salesLeafCategoryChipMarkersVisible } else { $currentViewCategoryChipsVisibleBeforeFooter }
    actualChromeSubmenuExercisePassed = if ($ExerciseSubmenus) { [bool]$submenuExercise.ok } else { $null }
    actualChromeLeafPageExercisePassed = if ($ExerciseLeafPages) { [bool]$leafExercise.ok } else { $null }
  }
  actualChromeSubmenuExercise = $submenuExercise
  actualChromeLeafPageExercise = $leafExercise
  visibleNodes = $nodes |
    Where-Object {
      $_.name -match "입/퇴실|고객 서비스 관리|업무 관리|템플릿 / 양식 편집|세탁물 관리|매지출 관리|공항밴 관리|객실 정보 리마크|NAVER / STATION 예약입력|업무보고 양식|안내문 편집 / 빠른답변 편집|업무 양식 편집|카테고리|소모품|수리|식음료|기타|체크인 목록|체크아웃 목록|객실 선택|설정|새 지출|보고|2026.06.05|The Gangnam" -or
      (Test-ClassToken $_ "app-shell") -or
      (Test-ClassToken $_ "home-surface") -or
      (Test-ClassToken $_ "screen-stage") -or
      (Test-ClassToken $_ "home-fixed-bottom-bar") -or
      (Test-ClassToken $_ "work-surface") -or
      (Test-ClassToken $_ "sales-category-panel") -or
      $_.class -eq "SidePanelHeader"
    } |
    Select-Object depth, type, name, class, rect
}

$jsonPath = Join-Path $OutDir "actual-chrome-sidepanel-proof.json"
$proof | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Output $jsonPath

if ($ExerciseSubmenus -and $proof.checks.actualChromeSubmenuExercisePassed -ne $true) {
  Write-Warning "Actual Chrome submenu exercise did not pass; see actualChromeSubmenuExercise in the proof JSON."
}

if ($ExerciseLeafPages -and $proof.checks.actualChromeLeafPageExercisePassed -ne $true) {
  Write-Warning "Actual Chrome leaf page exercise did not pass; see actualChromeLeafPageExercise in the proof JSON."
}
