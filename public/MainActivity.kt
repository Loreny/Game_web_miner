package com.pioneer.goldrush

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Locale
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.random.Random

// ============================================================================
// 1. DATA MODELS & CONFIGURATION
// ============================================================================

enum class UpgradeBranch {
    TOOLS,
    MACHINERY,
    MARKET,
    GEOLOGY
}

enum class BuyMode {
    X1,
    X10,
    MAX
}

enum class Screen {
    MINING,
    UPGRADES,
    MISSIONS,
    MUSEUM,
    SETTINGS
}

enum class WeatherType {
    CLEAR_SKIES,
    HEAVY_RAIN,
    DROUGHT,
    RIVER_SWELL,
    HEAT_WAVE
}

data class WeatherEvent(
    val type: WeatherType,
    val name: String,
    val description: String,
    val manualMultiplier: Double,
    val machineryMultiplier: Double,
    val gravelPriceMultiplier: Double,
    val durationSeconds: Int,
    val effectLabel: String,
    val isPositive: Boolean = true
)

enum class MissionType {
    SIFT_DIRT,
    SPEND_CASH,
    BUY_UPGRADES,
    MANUAL_CLICKS,
    EARN_CASH,
    REBIRTH_TIERS
}

data class DailyMission(
    val id: String,
    val title: String,
    val description: String,
    val target: Double,
    val rewardCash: Double,
    val rewardCertificates: Int = 0,
    val type: MissionType,
    val unit: String,
    val isClaimed: Boolean = false
)

data class WeeklyMission(
    val id: String,
    val title: String,
    val description: String,
    val target: Double,
    val rewardCash: Double,
    val rewardCertificates: Int = 0,
    val type: MissionType,
    val unit: String,
    val isClaimed: Boolean = false
)

data class BulkPurchaseInfo(
    val count: Int,
    val totalCost: Double,
    val canAfford: Boolean
)

data class ClaimTierInfo(
    val tier: Int,
    val name: String,
    val capacityGrams: Double,
    val baseHardness: Double
)

val CLAIM_TIERS = listOf(
    ClaimTierInfo(1, "Riverbank Alluvium", 1_000_000.0, 1.0),
    ClaimTierInfo(2, "Compacted Creek Clay", 8_000_000.0, 2.5),
    ClaimTierInfo(3, "Glacial Till & Granite", 64_000_000.0, 6.0),
    ClaimTierInfo(4, "Cemented Bedrock Bench", 512_000_000.0, 15.0),
    ClaimTierInfo(5, "Permafrost Quartz Vein", 4_096_000_000.0, 38.0),
    ClaimTierInfo(6, "Abyssal Hypothermal Fissure", 32_768_000_000.0, 95.0)
)

fun getClaimTierInfo(tier: Int): ClaimTierInfo {
    val index = (tier - 1).coerceAtLeast(0)
    if (index < CLAIM_TIERS.size) {
        return CLAIM_TIERS[index]
    }
    val cap = 1_000_000.0 * 8.0.pow(index.toDouble())
    val hardness = 1.0 * 2.5.pow(index.toDouble())
    return ClaimTierInfo(tier, "Tier $tier: Deep Pluton", cap, hardness)
}

/**
 * Spawns strictly in the bottom 25% of the claim (between 75% and 95% depth)
 */
fun generateNuggetDepth(capacity: Double): Double {
    val depthFraction = 0.75 + Random.nextDouble() * 0.20
    return capacity * (1.0 - depthFraction)
}

data class PrestigePerk(
    val id: String,
    val name: String,
    val description: String,
    val level: Int = 0,
    val maxLevel: Int = 5,
    val baseCost: Int,
    val costRatio: Double,
    val effectValuePerLevel: Double,
    val iconName: String
) {
    val currentCost: Int
        get() = (baseCost * costRatio.pow(level.toDouble())).toInt()

    val isMaxed: Boolean
        get() = level >= maxLevel
}

data class UpgradeItem(
    val id: String,
    val name: String,
    val description: String,
    val branch: UpgradeBranch,
    val baseCost: Double,
    val powerIncrease: Double,
    val costRatio: Double,
    val level: Int = 0,
    val iconName: String,
    val unitLabel: String
) {
    val singleCost: Double
        get() = baseCost * costRatio.pow(level.toDouble())

    // Milestone bonus: 2x multiplier for every 25 levels (25, 50, 75, 100...)
    val milestoneMultiplier: Double
        get() {
            val count = level / 25
            return 2.0.pow(count.toDouble())
        }

    val milestoneProgress: Int
        get() = level % 25

    val totalOutput: Double
        get() = level * powerIncrease * milestoneMultiplier

    fun calculateBulkCost(count: Int): Double {
        if (count <= 0) return 0.0
        if (costRatio == 1.0) return singleCost * count
        val rL = costRatio.pow(level.toDouble())
        val factor = (costRatio.pow(count.toDouble()) - 1.0) / (costRatio - 1.0)
        return baseCost * rL * factor
    }

    fun calculateMaxLevels(cash: Double): Int {
        if (cash < singleCost) return 0
        if (costRatio == 1.0) return max(0, (cash / baseCost).toInt())
        val rL = costRatio.pow(level.toDouble())
        val numerator = cash * (costRatio - 1.0)
        val term = 1.0 + numerator / (baseCost * rL)
        if (term <= 0.0) return 1
        val count = floor(ln(term) / ln(costRatio)).toInt()
        return max(1, count)
    }

    fun getBulkPurchase(mode: BuyMode, cash: Double): BulkPurchaseInfo {
        return when (mode) {
            BuyMode.X1 -> {
                val cost = singleCost
                BulkPurchaseInfo(1, cost, cash >= cost)
            }
            BuyMode.X10 -> {
                val cost = calculateBulkCost(10)
                BulkPurchaseInfo(10, cost, cash >= cost)
            }
            BuyMode.MAX -> {
                val maxL = calculateMaxLevels(cash)
                if (maxL <= 0) {
                    BulkPurchaseInfo(1, singleCost, false)
                } else {
                    val cost = calculateBulkCost(maxL)
                    BulkPurchaseInfo(maxL, cost, cash >= cost)
                }
            }
        }
    }
}

data class GoldenNugget(
    val id: String,
    val name: String,
    val weightGrams: Double,
    val multiplierBonus: Double,
    val claimTier: Int,
    val lore: String,
    val discoveryDate: String = "Claim #$claimTier",
    val certificatesAwarded: Int = 25
)

data class FloatingParticle(
    val id: Long,
    val text: String,
    val subText: String,
    val xOffset: Float,
    val yOffset: Float,
    val createdAt: Long = System.currentTimeMillis(),
    val isCrit: Boolean = false,
    val isFlake: Boolean = false,
    val isGold: Boolean = false
)

enum class AchievementCategory {
    PROGRESS,
    UPGRADES,
    MASTERY,
    MUSEUM,
    SECRETS
}

enum class TierRank {
    BRONZE,
    SILVER,
    GOLD,
    DIAMOND,
    SECRET
}

data class AchievementTier(
    val tierLevel: Int,
    val threshold: Double,
    val titleSuffix: String,
    val tierRank: TierRank,
    val rewardCash: Double,
    val rewardCertificates: Int = 0
)

data class AchievementChain(
    val id: String,
    val title: String,
    val descriptionFormat: String,
    val category: AchievementCategory,
    val unit: String,
    val tiers: List<AchievementTier>,
    val getValue: (GameState) -> Double
)

data class Achievement(
    val id: String,
    val title: String,
    val description: String,
    val target: Double,
    val rewardCash: Double,
    val unit: String,
    val isClaimed: Boolean = false
)

data class GameState(
    val cash: Double = 0.0,
    val remainingDirtGrams: Double = 1_000_000.0,
    val maxDirtCapacity: Double = 1_000_000.0,
    val claimTier: Int = 1,
    val basePricePerGram: Double = 0.01,
    val nuggetHiddenAtGrams: Double = 150_000.0,
    val currentHiddenNugget: GoldenNugget = generateRandomNugget(1, 1_000_000.0),
    val discoveredNuggets: List<GoldenNugget> = emptyList(),
    // Prestige Tokens ("Assayer's Certificates") & Permanent Tech Tree
    val prestigeTokens: Int = 0,
    val prestigePerks: List<PrestigePerk> = defaultPrestigePerks(),
    // 4 Upgrade Branches
    val toolsUpgrades: List<UpgradeItem> = defaultToolsUpgrades(),
    val machineryUpgrades: List<UpgradeItem> = defaultMachineryUpgrades(),
    val marketUpgrades: List<UpgradeItem> = defaultMarketUpgrades(),
    val geologyUpgrades: List<UpgradeItem> = defaultGeologyUpgrades(),
    val achievements: List<Achievement> = defaultAchievements(),
    val claimedMilestones: Map<String, Int> = emptyMap(),
    val totalDirtSifted: Double = 0.0,
    val totalCashEarned: Double = 0.0,
    val totalCashSpent: Double = 0.0,
    val totalUpgradesBought: Long = 0,
    val totalManualClicks: Long = 0,
    val totalCrits: Long = 0,
    val totalShatters: Long = 0,
    val totalFlakesFound: Long = 0,
    val totalBulkDeliveries: Long = 0,
    val totalWeatherCycles: Long = 0,
    val highestHardnessBeaten: Double = 1.0,
    val maxComboReached: Double = 1.0,
    val totalRebirths: Int = 0,
    val totalMissionsClaimed: Long = 0,
    val pendingNuggetDiscovery: GoldenNugget? = null,
    // Weather System
    val weatherEnabled: Boolean = true,
    val currentWeather: WeatherEvent = defaultWeatherPool().first(),
    val weatherSecondsRemaining: Int = 50,
    // Daily Mission System (Scaled up volume & 24h reset)
    val dailyMissions: List<DailyMission> = generateDailyMissions(),
    val lastDailyResetTimestamp: Long = System.currentTimeMillis(),
    val todayDirtSifted: Double = 0.0,
    val todayCashSpent: Double = 0.0,
    val todayUpgradesBought: Long = 0,
    val todayManualClicks: Long = 0,
    val todayCashEarned: Double = 0.0,
    // Weekly Mission System (7-Day Duration & High Value Rewards)
    val weeklyMissions: List<WeeklyMission> = generateWeeklyMissions(),
    val lastWeeklyResetTimestamp: Long = System.currentTimeMillis(),
    val weekDirtSifted: Double = 0.0,
    val weekCashSpent: Double = 0.0,
    val weekUpgradesBought: Long = 0,
    val weekManualClicks: Long = 0,
    val weekCashEarned: Double = 0.0,
    val weekNuggetsFound: Int = 0,
    // Active gameplay modifiers
    val comboMultiplier: Double = 1.0,
    val lastTapTimestamp: Long = 0L,
    val bulkDeliverySecondsRemaining: Int = 30,
    val buyMode: BuyMode = BuyMode.X1
)
 {
    val claimInfo: ClaimTierInfo
        get() = getClaimTierInfo(claimTier)

    val hardnessReductionBonus: Double
        get() = (prestigePerks.find { it.id == "perk_diamond_chisels" }?.level ?: 0) * 0.10

    val effectiveHardness: Double
        get() = (claimInfo.baseHardness * (1.0 - hardnessReductionBonus)).coerceAtLeast(0.25)

    val permanentPriceMult: Double
        get() = 1.0 + (prestigePerks.find { it.id == "perk_assayer_grade" }?.level ?: 0) * 0.25

    val masterProspectorMult: Double
        get() = 1.0 + (prestigePerks.find { it.id == "perk_master_prospector" }?.level ?: 0) * 0.20

    val startingCashBonus: Double
        get() = (prestigePerks.find { it.id == "perk_grubstake" }?.level ?: 0) * 50.0

    val steamShovelStripPct: Double
        get() = (prestigePerks.find { it.id == "perk_overburden_strip" }?.level ?: 0) * 0.05

    val allUpgrades: List<UpgradeItem>
        get() = toolsUpgrades + machineryUpgrades + marketUpgrades + geologyUpgrades

    val totalToolLevels: Int
        get() = toolsUpgrades.sumOf { it.level }

    val relicMultiplier: Double
        get() = 1.0 + discoveredNuggets.sumOf { it.multiplierBonus }

    val weatherManualMult: Double
        get() = if (weatherEnabled) currentWeather.manualMultiplier else 1.0

    val weatherMachineryMult: Double
        get() = if (weatherEnabled) currentWeather.machineryMultiplier else 1.0

    val weatherGravelPriceMult: Double
        get() = if (weatherEnabled) currentWeather.gravelPriceMultiplier else 1.0

    val gravelCrusherBonus: Double
        get() {
            val crusher = marketUpgrades.find { it.id == "market_gravel_crusher" } ?: return 0.0
            return crusher.totalOutput
        }

    val effectivePricePerGram: Double
        get() = (basePricePerGram + gravelCrusherBonus) * weatherGravelPriceMult * permanentPriceMult

    val synergyBearingMultiplier: Double
        get() {
            val grease = machineryUpgrades.find { it.id == "mach_bearing_grease" } ?: return 1.0
            if (grease.level <= 0) return 1.0
            val setsOf10 = totalToolLevels / 10
            return 1.0 + (grease.level * setsOf10 * 0.10 * grease.milestoneMultiplier)
        }

    val totalClaimedMilestonesCount: Int
        get() = claimedMilestones.values.sum()

    val achievementMetaMultiplier: Double
        get() = 1.0 + totalClaimedMilestonesCount * 0.003

    val rawClickPower: Double
        get() {
            val sieve = toolsUpgrades.find { it.id == "tool_sieve" }
            val baseManual = 1.0 + (sieve?.totalOutput ?: 0.0)
            return baseManual * relicMultiplier * weatherManualMult * comboMultiplier * masterProspectorMult * achievementMetaMultiplier
        }

    val effectiveClickPower: Double
        get() = (rawClickPower / effectiveHardness).coerceAtLeast(0.1)

    val rawAutoRate: Double
        get() {
            val baseMachinery = machineryUpgrades
                .filter { it.id != "mach_bearing_grease" }
                .sumOf { it.totalOutput }
            return baseMachinery * relicMultiplier * weatherMachineryMult * synergyBearingMultiplier * masterProspectorMult * achievementMetaMultiplier
        }

    val wearMultiplier: Double
        get() = 1.0 / (1.0 + (rawAutoRate / 50000.0).pow(0.5))

    val autoRatePerSec: Double
        get() = ((rawAutoRate * wearMultiplier) / effectiveHardness).coerceAtLeast(0.0)

    val cashEarnedPerSec: Double
        get() = autoRatePerSec * effectivePricePerGram

    val progressFraction: Float
        get() {
            val sifted = (maxDirtCapacity - remainingDirtGrams).coerceAtLeast(0.0)
            return (sifted / maxDirtCapacity).coerceIn(0.0, 1.0).toFloat()
        }

    val isDetectorActive: Boolean
        get() {
            val detector = geologyUpgrades.find { it.id == "geo_pulse_detector" } ?: return false
            if (detector.level <= 0) return false
            val distance = kotlin.math.abs(remainingDirtGrams - nuggetHiddenAtGrams)
            return distance <= (maxDirtCapacity * 0.15)
        }

    val probeDepthRange: Pair<Double, Double>?
        get() {
            val probe = geologyUpgrades.find { it.id == "geo_probe" } ?: return null
            if (probe.level <= 0) return null
            val spreadFactor = when (probe.level) {
                1 -> 0.15
                2 -> 0.10
                3 -> 0.05
                else -> 0.02
            }
            val minDepth = max(0.0, nuggetHiddenAtGrams * (1.0 - spreadFactor))
            val maxDepth = min(maxDirtCapacity, nuggetHiddenAtGrams * (1.0 + spreadFactor))
            return Pair(minDepth, maxDepth)
        }

    val affordableUpgradesCount: Int
        get() = allUpgrades.count { cash >= it.singleCost }

    val affordableUpgrades: List<UpgradeItem>
        get() = allUpgrades.filter { cash >= it.singleCost }

    val claimableDailyCount: Int
        get() = dailyMissions.count { !it.isClaimed && getDailyMissionProgress(it) >= it.target }

    val claimableWeeklyCount: Int
        get() = weeklyMissions.count { !it.isClaimed && getWeeklyMissionProgress(it) >= it.target }

    val claimableMilestonesCount: Int
        get() = defaultAchievementChains().count { chain ->
            val lvl = claimedMilestones[chain.id] ?: 0
            lvl < chain.tiers.size && chain.getValue(this) >= chain.tiers[lvl].threshold
        }

    val claimableMissionsCount: Int
        get() = claimableDailyCount + claimableWeeklyCount + claimableMilestonesCount

    fun getDailyMissionProgress(mission: DailyMission): Double = when (mission.type) {
        MissionType.SIFT_DIRT -> todayDirtSifted
        MissionType.SPEND_CASH -> todayCashSpent
        MissionType.BUY_UPGRADES -> todayUpgradesBought.toDouble()
        MissionType.MANUAL_CLICKS -> todayManualClicks.toDouble()
        MissionType.EARN_CASH -> todayCashEarned
        MissionType.REBIRTH_TIERS -> 0.0
    }

    fun getWeeklyMissionProgress(mission: WeeklyMission): Double = when (mission.type) {
        MissionType.SIFT_DIRT -> weekDirtSifted
        MissionType.SPEND_CASH -> weekCashSpent
        MissionType.BUY_UPGRADES -> weekUpgradesBought.toDouble()
        MissionType.MANUAL_CLICKS -> weekManualClicks.toDouble()
        MissionType.EARN_CASH -> weekCashEarned
        MissionType.REBIRTH_TIERS -> weekNuggetsFound.toDouble()
    }
}

// ============================================================================
// DEFAULT UPGRADE CONFIGURATIONS (REBALANCED WITH INFLATION MULTIPLIERS 1.18 - 1.25)
// ============================================================================

fun defaultToolsUpgrades(): List<UpgradeItem> = listOf(
    UpgradeItem(
        id = "tool_sieve",
        name = "Calibrated Sieve",
        description = "Precision wire mesh capturing finer alluvial gold",
        branch = UpgradeBranch.TOOLS,
        baseCost = 0.50,
        powerIncrease = 1.0,
        costRatio = 1.18,
        iconName = "sieve",
        unitLabel = "g/tap"
    ),
    UpgradeItem(
        id = "tool_magnetic_pan",
        name = "Magnetic Pan",
        description = "Polarized rim captures black sands (+5% crit chance for 10x yield)",
        branch = UpgradeBranch.TOOLS,
        baseCost = 5.00,
        powerIncrease = 5.0,
        costRatio = 1.20,
        iconName = "pan",
        unitLabel = "% crit"
    ),
    UpgradeItem(
        id = "tool_prospector_rhythm",
        name = "Prospector Rhythm",
        description = "Rhythmic swirling builds tap combo meter up to 3x multiplier",
        branch = UpgradeBranch.TOOLS,
        baseCost = 25.00,
        powerIncrease = 1.0,
        costRatio = 1.22,
        iconName = "rhythm",
        unitLabel = "combo cap"
    ),
    UpgradeItem(
        id = "tool_diamond_pickaxe",
        name = "Diamond-Tip Pickaxe",
        description = "1% chance per tap to instantly shatter 500g paydirt vein",
        branch = UpgradeBranch.TOOLS,
        baseCost = 150.00,
        powerIncrease = 1.0,
        costRatio = 1.24,
        iconName = "pickaxe",
        unitLabel = "shatter %"
    )
)

fun defaultMachineryUpgrades(): List<UpgradeItem> = listOf(
    UpgradeItem(
        id = "mach_sluice_box",
        name = "Sluice Box",
        description = "Gravity-fed wooden flume with riffles washing paydirt",
        branch = UpgradeBranch.MACHINERY,
        baseCost = 20.00,
        powerIncrease = 2.0,
        costRatio = 1.19,
        iconName = "sluice",
        unitLabel = "g/sec"
    ),
    UpgradeItem(
        id = "mach_water_monitor",
        name = "High-Pressure Water Monitor",
        description = "Hydraulic wash giant blasting river gravel banks continuously",
        branch = UpgradeBranch.MACHINERY,
        baseCost = 120.00,
        powerIncrease = 18.0,
        costRatio = 1.21,
        iconName = "pump",
        unitLabel = "g/sec"
    ),
    UpgradeItem(
        id = "mach_diesel_trommel",
        name = "Diesel Trommel",
        description = "Heavy rotating motorized cylinder sorting gravel sizes",
        branch = UpgradeBranch.MACHINERY,
        baseCost = 650.00,
        powerIncrease = 90.0,
        costRatio = 1.22,
        iconName = "trommel",
        unitLabel = "g/sec"
    ),
    UpgradeItem(
        id = "mach_electric_dredge",
        name = "Electric Dredge",
        description = "Continuous suction line vacuuming riverbed placer deposits",
        branch = UpgradeBranch.MACHINERY,
        baseCost = 3500.00,
        powerIncrease = 500.0,
        costRatio = 1.24,
        iconName = "dredge",
        unitLabel = "g/sec"
    ),
    UpgradeItem(
        id = "mach_bearing_grease",
        name = "Synergy Bearing Grease",
        description = "+10% Machinery output per 10 total tool levels purchased",
        branch = UpgradeBranch.MACHINERY,
        baseCost = 15000.00,
        powerIncrease = 10.0,
        costRatio = 1.25,
        iconName = "grease",
        unitLabel = "% sync"
    )
)

fun defaultMarketUpgrades(): List<UpgradeItem> = listOf(
    UpgradeItem(
        id = "market_gravel_crusher",
        name = "Road Gravel Crusher",
        description = "Permanently raises base gravel price by +$0.005/g per level",
        branch = UpgradeBranch.MARKET,
        baseCost = 50.00,
        powerIncrease = 0.005,
        costRatio = 1.25,
        iconName = "crusher",
        unitLabel = "$/g"
    ),
    UpgradeItem(
        id = "market_gold_concentrator",
        name = "Centrifugal Gold Concentrator",
        description = "1.5%/s chance to find raw gold flakes yielding instant $10-$100 rewards",
        branch = UpgradeBranch.MARKET,
        baseCost = 300.00,
        powerIncrease = 1.5,
        costRatio = 1.22,
        iconName = "concentrator",
        unitLabel = "%/sec"
    ),
    UpgradeItem(
        id = "market_bulk_contract",
        name = "Bulk Delivery Contract",
        description = "Auto-sells sieved gravel every 30s with +25% bonus margin",
        branch = UpgradeBranch.MARKET,
        baseCost = 2000.00,
        powerIncrease = 25.0,
        costRatio = 1.25,
        iconName = "contract",
        unitLabel = "% margin"
    )
)

fun defaultGeologyUpgrades(): List<UpgradeItem> = listOf(
    UpgradeItem(
        id = "geo_probe",
        name = "Geological Probe",
        description = "Reveals approximate nugget depth range on the main HUD",
        branch = UpgradeBranch.GEOLOGY,
        baseCost = 100.00,
        powerIncrease = 1.0,
        costRatio = 1.30,
        iconName = "probe",
        unitLabel = "sensor"
    ),
    UpgradeItem(
        id = "geo_pulse_detector",
        name = "Pulse Metal Detector",
        description = "Screen border begins glowing gold when remaining dirt is within 15% of the nugget",
        branch = UpgradeBranch.GEOLOGY,
        baseCost = 800.00,
        powerIncrease = 1.0,
        costRatio = 1.35,
        iconName = "detector",
        unitLabel = "beacon"
    ),
    UpgradeItem(
        id = "geo_radar",
        name = "Ground Penetrating Radar",
        description = "Auto-strips initial 10% barren topsoil upon starting any new claim",
        branch = UpgradeBranch.GEOLOGY,
        baseCost = 5000.00,
        powerIncrease = 10.0,
        costRatio = 1.40,
        iconName = "radar",
        unitLabel = "% topsoil"
    )
)

fun defaultPrestigePerks(): List<PrestigePerk> = listOf(
    PrestigePerk(
        id = "perk_diamond_chisels",
        name = "Diamond Chisel Bits",
        description = "-10% Rock Hardness per level (up to -50%)",
        level = 0,
        maxLevel = 5,
        baseCost = 25,
        costRatio = 1.8,
        effectValuePerLevel = 0.10,
        iconName = "chisel"
    ),
    PrestigePerk(
        id = "perk_assayer_grade",
        name = "Certified Assayer's Seal",
        description = "+25% Permanent Gravel Price per level",
        level = 0,
        maxLevel = 10,
        baseCost = 30,
        costRatio = 1.7,
        effectValuePerLevel = 0.25,
        iconName = "seal"
    ),
    PrestigePerk(
        id = "perk_grubstake",
        name = "Frontier Grubstake",
        description = "Start new claims with +$50.00 cash per level",
        level = 0,
        maxLevel = 10,
        baseCost = 20,
        costRatio = 1.6,
        effectValuePerLevel = 50.0,
        iconName = "grubstake"
    ),
    PrestigePerk(
        id = "perk_master_prospector",
        name = "Master Prospector",
        description = "+20% Global Manual & Machine Output per level",
        level = 0,
        maxLevel = 10,
        baseCost = 40,
        costRatio = 1.9,
        effectValuePerLevel = 0.20,
        iconName = "prospector"
    ),
    PrestigePerk(
        id = "perk_overburden_strip",
        name = "Topsoil Steam Shovel",
        description = "Auto-strips 5% initial barren overburden on every claim",
        level = 0,
        maxLevel = 6,
        baseCost = 50,
        costRatio = 2.0,
        effectValuePerLevel = 0.05,
        iconName = "shovel"
    )
)

fun defaultWeatherPool(): List<WeatherEvent> = listOf(
    WeatherEvent(
        type = WeatherType.CLEAR_SKIES,
        name = "Clear Skies",
        description = "Temperate mountain conditions across the claim.",
        manualMultiplier = 1.0,
        machineryMultiplier = 1.0,
        gravelPriceMultiplier = 1.0,
        durationSeconds = 60,
        effectLabel = "Normal Yields",
        isPositive = true
    ),
    WeatherEvent(
        type = WeatherType.HEAVY_RAIN,
        name = "Heavy Rain",
        description = "Rushing water breaks down gravel banks faster!",
        manualMultiplier = 1.20,
        machineryMultiplier = 1.0,
        gravelPriceMultiplier = 1.0,
        durationSeconds = 45,
        effectLabel = "+20% Manual Speed",
        isPositive = true
    ),
    WeatherEvent(
        type = WeatherType.DROUGHT,
        name = "Summer Drought",
        description = "Low water levels reduce hydraulic sluice pump pressure.",
        manualMultiplier = 1.0,
        machineryMultiplier = 0.90,
        gravelPriceMultiplier = 1.0,
        durationSeconds = 40,
        effectLabel = "-10% Machine Rate",
        isPositive = false
    ),
    WeatherEvent(
        type = WeatherType.RIVER_SWELL,
        name = "River Swell",
        description = "High-pressure rapids spin trommels and sluices at peak power!",
        manualMultiplier = 1.10,
        machineryMultiplier = 1.25,
        gravelPriceMultiplier = 1.0,
        durationSeconds = 45,
        effectLabel = "+25% Machine Rate",
        isPositive = true
    ),
    WeatherEvent(
        type = WeatherType.HEAT_WAVE,
        name = "Scorching Heat",
        description = "Regional construction boom spikes gravel and sand prices!",
        manualMultiplier = 1.0,
        machineryMultiplier = 1.0,
        gravelPriceMultiplier = 1.30,
        durationSeconds = 50,
        effectLabel = "+30% Gravel Price",
        isPositive = true
    )
)

// ============================================================================
// EXPANDED DAILY MISSIONS POOL (SCALED UP FOR 1M+ CLAIM CAPACITIES)
// ============================================================================

val DAILY_MISSION_POOL = listOf(
    DailyMission("m_sift_100k", "Alluvial Shoveler", "Sift 100,000 g of paydirt today", 100_000.0, 350.0, 5, MissionType.SIFT_DIRT, "g"),
    DailyMission("m_sift_250k", "Terrace Flume Shoveler", "Sift 250,000 g of paydirt today", 250_000.0, 650.0, 8, MissionType.SIFT_DIRT, "g"),
    DailyMission("m_sift_350k", "Deep Pit Excavator", "Sift 350,000 g of paydirt today", 350_000.0, 900.0, 10, MissionType.SIFT_DIRT, "g"),
    DailyMission("m_sift_500k", "Bedrock Channel Cutter", "Sift 500,000 g of paydirt today", 500_000.0, 1_400.0, 12, MissionType.SIFT_DIRT, "g"),
    DailyMission("m_sift_750k", "Bedrock Stripper", "Sift 750,000 g of paydirt today", 750_000.0, 2_200.0, 15, MissionType.SIFT_DIRT, "g"),
    DailyMission("m_spend_2500", "Equipment Investor", "Spend $2,500.00 on claim upgrades today", 2_500.0, 600.0, 8, MissionType.SPEND_CASH, "$"),
    DailyMission("m_spend_5000", "Capital Equipment Outfitter", "Spend $5,000.00 on claim upgrades today", 5_000.0, 1_250.0, 12, MissionType.SPEND_CASH, "$"),
    DailyMission("m_spend_10k", "Industrial Magnate", "Spend $10,000.00 on claim upgrades today", 10_000.0, 2_500.0, 18, MissionType.SPEND_CASH, "$"),
    DailyMission("m_buy_15", "Fleet Modernization", "Purchase 15 upgrades today", 15.0, 500.0, 6, MissionType.BUY_UPGRADES, "upgrades"),
    DailyMission("m_buy_25", "Industrial Modernizer", "Purchase 25 upgrades today", 25.0, 800.0, 9, MissionType.BUY_UPGRADES, "upgrades"),
    DailyMission("m_buy_35", "Heavy Mechanization", "Purchase 35 upgrades today", 35.0, 1_200.0, 12, MissionType.BUY_UPGRADES, "upgrades"),
    DailyMission("m_taps_250", "Prospector Swirl", "Manually scoop the gold pan 250 times", 250.0, 400.0, 5, MissionType.MANUAL_CLICKS, "taps"),
    DailyMission("m_taps_400", "Rhythmic Gold Panner", "Manually scoop the gold pan 400 times", 400.0, 650.0, 8, MissionType.MANUAL_CLICKS, "taps"),
    DailyMission("m_taps_600", "Swirl Master", "Manually scoop the gold pan 600 times", 600.0, 950.0, 12, MissionType.MANUAL_CLICKS, "taps"),
    DailyMission("m_earn_1500", "Gravel Merchant", "Earn $1,500.00 from industrial gravel today", 1_500.0, 500.0, 7, MissionType.EARN_CASH, "$"),
    DailyMission("m_earn_3000", "Aggregate Freight Broker", "Earn $3,000.00 from industrial gravel today", 3_000.0, 950.0, 10, MissionType.EARN_CASH, "$"),
    DailyMission("m_earn_5000", "Mineral Supplier", "Earn $5,000.00 from industrial gravel today", 5_000.0, 1_500.0, 15, MissionType.EARN_CASH, "$")
)

fun generateDailyMissions(): List<DailyMission> {
    return DAILY_MISSION_POOL.shuffled().take(5)
}

// ============================================================================
// NEW WEEKLY MISSIONS POOL (7-DAY DURATION & HIGH VALUE PRESTIGE REWARDS)
// ============================================================================

val WEEKLY_MISSION_POOL = listOf(
    WeeklyMission("wm_sift_5m", "Klondike Earthmover", "Sift 5,000,000 g of paydirt this week", 5_000_000.0, 18_000.0, 45, MissionType.SIFT_DIRT, "g"),
    WeeklyMission("wm_sift_10m", "High-Bench Terrace Dredger", "Sift 10,000,000 g of paydirt this week", 10_000_000.0, 35_000.0, 65, MissionType.SIFT_DIRT, "g"),
    WeeklyMission("wm_sift_25m", "Glacial Basin Dredger", "Sift 25,000,000 g of paydirt this week", 25_000_000.0, 75_000.0, 90, MissionType.SIFT_DIRT, "g"),
    WeeklyMission("wm_sift_50m", "Deep Canyon Excavation", "Sift 50,000,000 g of paydirt this week", 50_000_000.0, 120_000.0, 130, MissionType.SIFT_DIRT, "g"),
    WeeklyMission("wm_sift_100m", "Glacial Bedrock Core Drill", "Sift 100,000,000 g of paydirt this week", 100_000_000.0, 250_000.0, 220, MissionType.SIFT_DIRT, "g"),
    WeeklyMission("wm_spend_50k", "Heavy Iron Procurement", "Spend $50,000.00 on equipment this week", 50_000.0, 22_000.0, 40, MissionType.SPEND_CASH, "$"),
    WeeklyMission("wm_spend_100k", "Mining Syndicate Capital", "Spend $100,000.00 on equipment this week", 100_000.0, 40_000.0, 60, MissionType.SPEND_CASH, "$"),
    WeeklyMission("wm_spend_250k", "Syndicate Machinery Fund", "Spend $250,000.00 on equipment this week", 250_000.0, 95_000.0, 100, MissionType.SPEND_CASH, "$"),
    WeeklyMission("wm_spend_500k", "Mega-Mine Contractor", "Spend $500,000.00 on equipment this week", 500_000.0, 150_000.0, 160, MissionType.SPEND_CASH, "$"),
    WeeklyMission("wm_buy_50", "Placer Rig Upgrades", "Purchase 50 equipment upgrades this week", 50.0, 15_000.0, 35, MissionType.BUY_UPGRADES, "upgrades"),
    WeeklyMission("wm_buy_100", "Factory Line Overhaul", "Purchase 100 equipment upgrades this week", 100.0, 30_000.0, 50, MissionType.BUY_UPGRADES, "upgrades"),
    WeeklyMission("wm_buy_175", "Industrial Automation Wave", "Purchase 175 equipment upgrades this week", 175.0, 55_000.0, 75, MissionType.BUY_UPGRADES, "upgrades"),
    WeeklyMission("wm_buy_250", "Continental Mechanization", "Purchase 250 equipment upgrades this week", 250.0, 80_000.0, 110, MissionType.BUY_UPGRADES, "upgrades"),
    WeeklyMission("wm_taps_1000", "Endurance Pan Prospecting", "Manually scoop the gold pan 1,000 times this week", 1_000.0, 12_000.0, 30, MissionType.MANUAL_CLICKS, "taps"),
    WeeklyMission("wm_taps_2500", "Legendary Panner", "Manually scoop the gold pan 2,500 times this week", 2_500.0, 25_000.0, 55, MissionType.MANUAL_CLICKS, "taps"),
    WeeklyMission("wm_taps_5000", "Klondike Iron Wrist", "Manually scoop the gold pan 5,000 times this week", 5_000.0, 50_000.0, 90, MissionType.MANUAL_CLICKS, "taps"),
    WeeklyMission("wm_earn_50k", "Industrial Aggregate King", "Earn $50,000.00 from gravel sales this week", 50_000.0, 30_000.0, 60, MissionType.EARN_CASH, "$"),
    WeeklyMission("wm_earn_100k", "Railroad Ballast Supplier", "Earn $100,000.00 from gravel sales this week", 100_000.0, 55_000.0, 80, MissionType.EARN_CASH, "$"),
    WeeklyMission("wm_earn_250k", "Trans-Continental Exporter", "Earn $250,000.00 from gravel sales this week", 250_000.0, 100_000.0, 140, MissionType.EARN_CASH, "$"),
    WeeklyMission("wm_rebirth_1", "Bedrock Pioneer", "Advance through at least 1 Claim Rebirth this week", 1.0, 35_000.0, 80, MissionType.REBIRTH_TIERS, "rebirths"),
    WeeklyMission("wm_rebirth_2", "Veteran Claim Pioneer", "Advance through 2 Claim Rebirths this week", 2.0, 70_000.0, 120, MissionType.REBIRTH_TIERS, "rebirths")
)

fun generateWeeklyMissions(): List<WeeklyMission> {
    return WEEKLY_MISSION_POOL.shuffled().take(10)
}

fun defaultAchievements(): List<Achievement> = listOf(
    Achievement("sift_1k", "First Paydirt", "Sift 1,000 grams of river gravel", 1_000.0, 5.0, "g"),
    Achievement("sift_50k", "Seasoned Prospector", "Sift 50,000 grams of gravel", 50_000.0, 25.0, "g"),
    Achievement("sift_1m", "Klondike Legend", "Sift 1,000,000 grams of dirt", 1_000_000.0, 150.0, "g"),
    Achievement("cash_100", "Gold In Pocket", "Accumulate $100.00 total earnings", 100.0, 15.0, "$"),
    Achievement("cash_2500", "Commercial Mine", "Accumulate $2,500.00 total earnings", 2_500.0, 100.0, "$"),
    Achievement("clicks_100", "Blistered Hands", "Manually scoop the pan 100 times", 100.0, 10.0, "taps"),
    Achievement("nuggets_1", "Strike It Rich!", "Discover your first legendary nugget", 1.0, 50.0, "relics"),
    Achievement("nuggets_3", "Museum Curator", "Collect 3 legendary nuggets in the museum", 3.0, 250.0, "relics")
)

fun create12TierChain(
    id: String,
    title: String,
    descriptionFormat: String,
    category: AchievementCategory,
    unit: String,
    thresholds: List<Double>,
    getValue: (GameState) -> Double,
    rewardMultiplier: Double = 1.0
): AchievementChain {
    val rankNames = listOf(
        Pair("Bronze I", TierRank.BRONZE),
        Pair("Bronze II", TierRank.BRONZE),
        Pair("Bronze III", TierRank.BRONZE),
        Pair("Silver I", TierRank.SILVER),
        Pair("Silver II", TierRank.SILVER),
        Pair("Silver III", TierRank.SILVER),
        Pair("Gold I", TierRank.GOLD),
        Pair("Gold II", TierRank.GOLD),
        Pair("Gold III", TierRank.GOLD),
        Pair("Diamond I", TierRank.DIAMOND),
        Pair("Diamond II", TierRank.DIAMOND),
        Pair("Diamond III", TierRank.DIAMOND)
    )
    val baseRewards = listOf(
        Pair(20.0, 0),
        Pair(50.0, 1),
        Pair(125.0, 2),
        Pair(300.0, 4),
        Pair(750.0, 8),
        Pair(1800.0, 14),
        Pair(4500.0, 22),
        Pair(12000.0, 35),
        Pair(30000.0, 55),
        Pair(85000.0, 90),
        Pair(250000.0, 160),
        Pair(800000.0, 280)
    )
    val tiers = thresholds.mapIndexed { idx, thresh ->
        val rankInfo = if (idx < rankNames.size) rankNames[idx] else Pair("Diamond III", TierRank.DIAMOND)
        val reward = if (idx < baseRewards.size) baseRewards[idx] else baseRewards.last()
        AchievementTier(
            tierLevel = idx + 1,
            threshold = thresh,
            titleSuffix = rankInfo.first,
            tierRank = rankInfo.second,
            rewardCash = kotlin.math.round(reward.first * rewardMultiplier),
            rewardCertificates = kotlin.math.round(reward.second * rewardMultiplier).toInt()
        )
    }
    return AchievementChain(id, title, descriptionFormat, category, unit, tiers, getValue)
}

fun defaultAchievementChains(): List<AchievementChain> = listOf(
    // 1. PROGRESS (12 chains x 12 tiers = 144)
    create12TierChain("prog_dirt", "Klondike Earthmover", "Sift a total of {threshold} of paydirt", AchievementCategory.PROGRESS, "g", listOf(100.0, 1_000.0, 10_000.0, 100_000.0, 1_000_000.0, 10_000_000.0, 100_000_000.0, 1_000_000_000.0, 10_000_000_000.0, 100_000_000_000.0, 1_000_000_000_000.0, 10_000_000_000_000.0), { it.totalDirtSifted }, 1.2),
    create12TierChain("prog_cash", "Gilded Fortune", "Accumulate {threshold} in total gross revenue", AchievementCategory.PROGRESS, "$", listOf(10.0, 100.0, 1_000.0, 10_000.0, 100_000.0, 1_000_000.0, 10_000_000.0, 100_000_000.0, 1_000_000_000.0, 10_000_000_000.0, 100_000_000_000.0, 1_000_000_000_000.0), { it.totalCashEarned }, 1.1),
    create12TierChain("prog_taps", "Pan Swirl Veteran", "Perform {threshold} manual pan swirl scoops", AchievementCategory.PROGRESS, "taps", listOf(10.0, 50.0, 150.0, 500.0, 1_200.0, 3_000.0, 7_500.0, 15_000.0, 30_000.0, 60_000.0, 120_000.0, 250_000.0), { it.totalManualClicks.toDouble() }, 1.0),
    create12TierChain("prog_claim_tier", "Placer Stratigraphy", "Reach claim tier depth {threshold}", AchievementCategory.PROGRESS, "Tier", listOf(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0), { it.claimTier.toDouble() }, 1.5),
    create12TierChain("prog_upgrades_bought", "Syndicate Mechanization", "Purchase {threshold} equipment upgrades", AchievementCategory.PROGRESS, "upgrades", listOf(5.0, 15.0, 35.0, 75.0, 150.0, 300.0, 600.0, 1_200.0, 2_500.0, 5_000.0, 10_000.0, 20_000.0), { it.totalUpgradesBought.toDouble() }, 1.0),
    create12TierChain("prog_cash_spent", "Capital Outlay", "Invest {threshold} in mining equipment", AchievementCategory.PROGRESS, "$", listOf(25.0, 250.0, 2_000.0, 15_000.0, 100_000.0, 750_000.0, 5_000_000.0, 30_000_000.0, 200_000_000.0, 1_500_000_000.0, 10_000_000_000.0, 100_000_000_000.0), { it.totalCashSpent }, 1.1),
    create12TierChain("prog_rebirths", "Pioneer Reclamation", "Complete {threshold} Claim Rebirths with discovered relics", AchievementCategory.PROGRESS, "rebirths", listOf(1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 14.0, 18.0, 25.0, 35.0, 50.0, 75.0), { (if (it.totalRebirths > 0) it.totalRebirths else it.discoveredNuggets.size).toDouble() }, 1.8),
    create12TierChain("prog_certs_earned", "Certified Assayer", "Accumulate career total of {threshold} certificates", AchievementCategory.PROGRESS, "📜", listOf(10.0, 30.0, 75.0, 150.0, 300.0, 600.0, 1_200.0, 2_500.0, 5_000.0, 10_000.0, 20_000.0, 50_000.0), { (it.prestigeTokens + it.prestigePerks.sumOf { p -> p.level * 25 }).toDouble() }, 1.3),
    create12TierChain("prog_perk_levels", "Syndicate Blueprint", "Unlock {threshold} total levels in Tech Tree", AchievementCategory.PROGRESS, "levels", listOf(1.0, 3.0, 6.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0), { it.prestigePerks.sumOf { p -> p.level }.toDouble() }, 1.4),
    create12TierChain("prog_missions_claimed", "Contract Specialist", "Fulfill and claim {threshold} daily & weekly missions", AchievementCategory.PROGRESS, "missions", listOf(1.0, 5.0, 15.0, 30.0, 60.0, 100.0, 150.0, 220.0, 300.0, 400.0, 500.0, 650.0), { it.totalMissionsClaimed.toDouble() }, 1.2),
    create12TierChain("prog_max_rate", "High Velocity Sifting", "Attain {threshold} processing speed per second", AchievementCategory.PROGRESS, "g/s", listOf(10.0, 50.0, 250.0, 1_000.0, 5_000.0, 25_000.0, 100_000.0, 500_000.0, 2_500_000.0, 10_000_000.0, 50_000_000.0, 200_000_000.0), { it.rawAutoRate }, 1.0),
    create12TierChain("prog_current_balance", "Liquid Treasury", "Hold {threshold} in ready cash reserves", AchievementCategory.PROGRESS, "$", listOf(50.0, 250.0, 1_500.0, 10_000.0, 75_000.0, 500_000.0, 3_500_000.0, 25_000_000.0, 150_000_000.0, 1_000_000_000.0, 10_000_000_000.0, 100_000_000_000.0), { it.cash }, 1.0),

    // 2. UPGRADES (15 chains x 12 tiers = 180)
    create12TierChain("upg_tool_sieve", "Calibrated Sieve Craft", "Upgrade Calibrated Sieve to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.toolsUpgrades.find { u -> u.id == "tool_sieve" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_tool_magnetic_pan", "Magnetic Pan Polarity", "Upgrade Magnetic Pan to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.toolsUpgrades.find { u -> u.id == "tool_magnetic_pan" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_tool_prospector_rhythm", "Prospector Rhythm Flow", "Upgrade Prospector Rhythm to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.toolsUpgrades.find { u -> u.id == "tool_prospector_rhythm" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_tool_diamond_pickaxe", "Diamond Pickaxe Edge", "Upgrade Diamond-Tip Pickaxe to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.toolsUpgrades.find { u -> u.id == "tool_diamond_pickaxe" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_mach_sluice_box", "Sluice Box Riffles", "Upgrade Sluice Box to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.machineryUpgrades.find { u -> u.id == "mach_sluice_box" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_mach_water_monitor", "Hydraulic Giant Pressure", "Upgrade High-Pressure Water Monitor to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.machineryUpgrades.find { u -> u.id == "mach_water_monitor" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_mach_diesel_trommel", "Diesel Trommel RPM", "Upgrade Diesel Trommel to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.machineryUpgrades.find { u -> u.id == "mach_diesel_trommel" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_mach_electric_dredge", "Electric Dredge Suction", "Upgrade Electric Dredge to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.machineryUpgrades.find { u -> u.id == "mach_electric_dredge" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_mach_bearing_grease", "Bearing Grease Viscosity", "Upgrade Synergy Bearing Grease to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.machineryUpgrades.find { u -> u.id == "mach_bearing_grease" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_market_gravel_crusher", "Road Aggregate Output", "Upgrade Road Gravel Crusher to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.marketUpgrades.find { u -> u.id == "market_gravel_crusher" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_market_gold_concentrator", "Centrifugal Centrifuge", "Upgrade Gold Concentrator to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.marketUpgrades.find { u -> u.id == "market_gold_concentrator" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_market_bulk_contract", "Bulk Freight Contracts", "Upgrade Bulk Delivery Contract to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(5.0, 10.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0), { (it.marketUpgrades.find { u -> u.id == "market_bulk_contract" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_geo_probe", "Sonic Acoustic Probe", "Upgrade Geological Probe to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(1.0, 2.0, 3.0, 5.0, 8.0, 12.0, 18.0, 25.0, 35.0, 50.0, 75.0, 100.0), { (it.geologyUpgrades.find { u -> u.id == "geo_probe" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_geo_pulse_detector", "Electromagnetic Pulse", "Upgrade Pulse Metal Detector to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(1.0, 2.0, 3.0, 5.0, 8.0, 12.0, 18.0, 25.0, 35.0, 50.0, 75.0, 100.0), { (it.geologyUpgrades.find { u -> u.id == "geo_pulse_detector" }?.level ?: 0).toDouble() }),
    create12TierChain("upg_geo_radar", "Sub-Surface GPR", "Upgrade Ground Penetrating Radar to Level {threshold}", AchievementCategory.UPGRADES, "lvl", listOf(1.0, 2.0, 3.0, 5.0, 8.0, 12.0, 18.0, 25.0, 35.0, 50.0, 75.0, 100.0), { (it.geologyUpgrades.find { u -> u.id == "geo_radar" }?.level ?: 0).toDouble() }),

    // 3. MASTERY & HAZARDS (8 chains x 12 tiers = 96)
    create12TierChain("mast_crits", "Magnetic Crit Precision", "Score {threshold} magnetic 10x critical strikes", AchievementCategory.MASTERY, "crits", listOf(5.0, 20.0, 50.0, 120.0, 300.0, 750.0, 1_500.0, 3_500.0, 8_000.0, 18_000.0, 40_000.0, 100_000.0), { (if (it.totalCrits > 0) it.totalCrits else it.totalManualClicks / 12).toDouble() }, 1.1),
    create12TierChain("mast_shatters", "Diamond Vein Shatters", "Trigger {threshold} diamond pick vein fractures", AchievementCategory.MASTERY, "shatters", listOf(3.0, 10.0, 25.0, 60.0, 150.0, 350.0, 800.0, 1_800.0, 4_000.0, 9_000.0, 20_000.0, 50_000.0), { (if (it.totalShatters > 0) it.totalShatters else it.totalManualClicks / 30).toDouble() }, 1.2),
    create12TierChain("mast_combo", "Rhythm Cadence Mastery", "Achieve a swirl rhythm combo multiplier of {threshold}x", AchievementCategory.MASTERY, "x", listOf(1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.5), { max(it.comboMultiplier, it.maxComboReached) }, 1.3),
    create12TierChain("mast_flakes", "Concentrator Gold Flakes", "Extract {threshold} instant raw gold flake deposits", AchievementCategory.MASTERY, "flakes", listOf(3.0, 10.0, 25.0, 60.0, 150.0, 350.0, 800.0, 1_800.0, 4_000.0, 9_000.0, 20_000.0, 50_000.0), { it.totalFlakesFound.toDouble() }, 1.2),
    create12TierChain("mast_bulk_deliveries", "Bulk Freight Logistics", "Dispatch {threshold} commercial aggregate shipments", AchievementCategory.MASTERY, "freights", listOf(2.0, 6.0, 15.0, 35.0, 80.0, 180.0, 400.0, 900.0, 2_000.0, 4_500.0, 10_000.0, 25_000.0), { it.totalBulkDeliveries.toDouble() }, 1.1),
    create12TierChain("mast_weather_survived", "Mountain Meteorology", "Work through {threshold} mountain weather shifts", AchievementCategory.MASTERY, "cycles", listOf(3.0, 8.0, 20.0, 45.0, 100.0, 200.0, 400.0, 800.0, 1_600.0, 3_000.0, 6_000.0, 12_000.0), { it.totalWeatherCycles.toDouble() }, 1.0),
    create12TierChain("mast_tap_spurt", "Endurance Panner", "Execute {threshold} gold pan swirl scoops today", AchievementCategory.MASTERY, "taps", listOf(50.0, 150.0, 400.0, 1_000.0, 2_500.0, 5_000.0, 10_000.0, 20_000.0, 40_000.0, 80_000.0, 160_000.0, 300_000.0), { it.todayManualClicks.toDouble() }, 1.0),
    create12TierChain("mast_hard_rock", "Hardness Penetration", "Overcome rock formations with hardness of at least {threshold}x", AchievementCategory.MASTERY, "x Hardness", listOf(1.0, 2.5, 6.0, 15.0, 38.0, 95.0, 200.0, 500.0, 1200.0, 3000.0, 8000.0, 20000.0), { max(it.highestHardnessBeaten, 1.0 * 2.5.pow(max(0, it.claimTier - 1).toDouble())) }, 1.5),

    // 4. MUSEUM & DISCOVERY (7 chains x 12 tiers = 84)
    create12TierChain("mus_nuggets_found", "Nugget Collector", "Discover and catalog {threshold} legendary relics", AchievementCategory.MUSEUM, "relics", listOf(1.0, 2.0, 3.0, 4.0, 5.0, 7.0, 10.0, 15.0, 20.0, 30.0, 45.0, 60.0), { it.discoveredNuggets.size.toDouble() }, 1.6),
    create12TierChain("mus_total_weight", "Museum Vault Mass", "Curate {threshold} of total native gold weight", AchievementCategory.MUSEUM, "g", listOf(30.0, 100.0, 300.0, 800.0, 2_000.0, 5_000.0, 12_000.0, 30_000.0, 75_000.0, 180_000.0, 400_000.0, 1_000_000.0), { it.discoveredNuggets.sumOf { n -> n.weightGrams } }, 1.4),
    create12TierChain("mus_max_single_weight", "The Great Boulder", "Unearth single nugget weighing over {threshold}", AchievementCategory.MUSEUM, "g", listOf(40.0, 80.0, 150.0, 300.0, 600.0, 1_200.0, 2_500.0, 5_000.0, 10_000.0, 25_000.0, 60_000.0, 150_000.0), { it.discoveredNuggets.maxOfOrNull { n -> n.weightGrams } ?: 0.0 }, 1.5),
    create12TierChain("mus_highest_bonus", "Legendary Radiance", "Possess a nugget with multiplier bonus of at least +{threshold}%", AchievementCategory.MUSEUM, "% bonus", listOf(25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 400.0, 600.0, 900.0, 1400.0, 2000.0), { (it.discoveredNuggets.maxOfOrNull { n -> n.multiplierBonus } ?: 0.0) * 100.0 }, 1.4),
    create12TierChain("mus_total_carats", "Carat Assay Rating", "Refine total estimated purity of {threshold} carats", AchievementCategory.MUSEUM, "ct", listOf(50.0, 150.0, 400.0, 1_000.0, 2_500.0, 6_000.0, 15_000.0, 35_000.0, 80_000.0, 180_000.0, 400_000.0, 1_000_000.0), { it.discoveredNuggets.sumOf { n -> n.weightGrams * 5.0 } }, 1.3),
    create12TierChain("mus_certs_from_nuggets", "Royal Assayer Endorsement", "Obtain {threshold} Assayer certificates from relic donations", AchievementCategory.MUSEUM, "📜", listOf(50.0, 150.0, 400.0, 1_000.0, 2_500.0, 6_000.0, 15_000.0, 35_000.0, 80_000.0, 180_000.0, 400_000.0, 1_000_000.0), { it.discoveredNuggets.sumOf { n -> n.certificatesAwarded }.toDouble() }, 1.4),
    create12TierChain("mus_tiers_cataloged", "Geological Horizons", "Uncover nuggets across {threshold} distinct claim tiers", AchievementCategory.MUSEUM, "tiers", listOf(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0), { it.discoveredNuggets.map { n -> n.claimTier }.distinct().size.toDouble() }, 1.6),

    // 5. SECRETS (12 easter eggs = 12)
    AchievementChain("sec_night_owl", "Night Owl Prospector", "Pan for gold in the dark hours of midnight (00:00 - 05:00)", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 500.0, 25)), { val h = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY); if (h in 0..4) 1.0 else 0.0 }),
    AchievementChain("sec_speed_demon", "Klondike Blitz", "Rapid-fire swirling: reach combo multiplier 2.5x", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 750.0, 30)), { if (it.comboMultiplier >= 2.5) 1.0 else 0.0 }),
    AchievementChain("sec_penny_pincher", "Scrooge McDuck", "Hoard over $1,000,000 in unspent liquid cash", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 2500.0, 50)), { if (it.cash >= 1_000_000.0) 1.0 else 0.0 }),
    AchievementChain("sec_dirt_poor", "Down to the Penny", "Have under $0.50 with active machinery running", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 100.0, 10)), { if (it.cash < 0.50 && it.totalUpgradesBought > 0) 1.0 else 0.0 }),
    AchievementChain("sec_rock_bottom", "Scraping the Bedrock", "Sift until less than 500 grams remain in your active claim", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 1200.0, 35)), { if (it.remainingDirtGrams in 0.1..500.0) 1.0 else 0.0 }),
    AchievementChain("sec_overheat_king", "Rhythm Overdrive", "Max out your prospector rhythm combo multiplier to 3.0x", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 1500.0, 40)), { if (it.comboMultiplier >= 3.0) 1.0 else 0.0 }),
    AchievementChain("sec_persistent", "Iron Wrist Prospector", "Log over 300 manual scoops in a single day", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 1000.0, 30)), { if (it.todayManualClicks >= 300) 1.0 else 0.0 }),
    AchievementChain("sec_storm_chaser", "Mountain Storm Chaser", "Pan during Heavy Rain or River Swell weather event", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 600.0, 20)), { if (it.currentWeather.type == WeatherType.HEAVY_RAIN || it.currentWeather.type == WeatherType.RIVER_SWELL) 1.0 else 0.0 }),
    AchievementChain("sec_jackpot", "Bonanza Flake", "Find at least 5 raw gold flakes with centrifugal concentrator", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 2000.0, 45)), { if (it.totalFlakesFound >= 5) 1.0 else 0.0 }),
    AchievementChain("sec_collector", "Museum Connoisseur", "House at least 3 unique golden relics in Museum display", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 3000.0, 60)), { if (it.discoveredNuggets.size >= 3) 1.0 else 0.0 }),
    AchievementChain("sec_synergy", "Industrial Harmony", "Own at least level 10 across all 4 primary machinery upgrades", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 4000.0, 80)), {
        val s = it.machineryUpgrades.find { u -> u.id == "mach_sluice_box" }?.level ?: 0
        val p = it.machineryUpgrades.find { u -> u.id == "mach_water_monitor" }?.level ?: 0
        val t = it.machineryUpgrades.find { u -> u.id == "mach_diesel_trommel" }?.level ?: 0
        val d = it.machineryUpgrades.find { u -> u.id == "mach_electric_dredge" }?.level ?: 0
        if (s >= 10 && p >= 10 && t >= 10 && d >= 10) 1.0 else 0.0
    }),
    AchievementChain("sec_perfectionist", "Klondike Pioneer Grandmaster", "Claim at least one milestone in every major category", AchievementCategory.SECRETS, "easter egg", listOf(AchievementTier(1, 1.0, "Secret I", TierRank.SECRET, 5000.0, 100)), {
        val keys = it.claimedMilestones.keys
        val hasP = keys.any { k -> k.startsWith("prog_") }
        val hasU = keys.any { k -> k.startsWith("upg_") }
        val hasM = keys.any { k -> k.startsWith("mast_") }
        val hasMus = keys.any { k -> k.startsWith("mus_") }
        if (hasP && hasU && hasM && hasMus) 1.0 else 0.0
    })
)

val TOTAL_MILESTONES_COUNT = defaultAchievementChains().sumOf { it.tiers.size }

val NUGGET_ARCHETYPES = listOf(
    Triple("Welcome Stranger of Klondike", "A fabled solid hunk of native gold uncovered near bedrock.", 0.25),
    Triple("Eureka Crown Jewel", "Gleams with crystalline quartz inclusions and 24K pure gold veins.", 0.35),
    Triple("Sierra Nevada Boulder", "Heavy nugget polished by millennia of rushing mountain flumes.", 0.50),
    Triple("Bonanza Creek Heart", "The legend of Dawson City, dense enough to tip industrial scales.", 0.65),
    Triple("Yukon Colossus", "Mammoth geological wonder discovered in the deep river bench.", 0.85),
    Triple("El Dorado Solar Relic", "Radiates an amber glow with unyielding natural splendor.", 1.10),
    Triple("Midas Bedrock Core", "Pure crystalline gold relic thought to exist only in miner myths.", 1.50)
)

fun generateRandomNugget(tier: Int, capacity: Double): GoldenNugget {
    val archetype = NUGGET_ARCHETYPES[(tier - 1) % NUGGET_ARCHETYPES.size]
    val weight = 45.0 * tier * (0.85 + Random.nextDouble() * 0.35)
    val bonus = archetype.third * (1.0 + (tier - 1) * 0.15)
    val certs = (floor(weight / 3.0) + (tier * 15)).toInt()
    return GoldenNugget(
        id = "nugget_t${tier}_${System.currentTimeMillis()}",
        name = archetype.first,
        weightGrams = weight,
        multiplierBonus = bonus,
        claimTier = tier,
        lore = archetype.second,
        certificatesAwarded = certs
    )
}

// ============================================================================
// 2. NUMBER FORMATTING UTILITY
// ============================================================================

object GameFormatters {
    fun formatNumber(value: Double): String {
        if (value < 0.0) return "-" + formatNumber(-value)
        return when {
            value >= 1_000_000_000_000.0 -> String.format(Locale.US, "%.2f T", value / 1_000_000_000_000.0)
            value >= 1_000_000_000.0 -> String.format(Locale.US, "%.2f B", value / 1_000_000_000.0)
            value >= 1_000_000.0 -> String.format(Locale.US, "%.2f M", value / 1_000_000.0)
            value >= 1_000.0 -> String.format(Locale.US, "%.2f K", value / 1_000.0)
            value >= 100.0 -> String.format(Locale.US, "%.0f", value)
            value >= 1.0 -> String.format(Locale.US, "%.2f", value)
            value > 0.0 -> String.format(Locale.US, "%.3f", value)
            else -> "0.00"
        }
    }

    fun formatCash(value: Double): String = "$" + formatNumber(value)

    fun formatGrams(value: Double): String = "${formatNumber(value)} g"
}

// ============================================================================
// 3. VIEWMODEL & STATE MANAGEMENT
// ============================================================================

class GoldRushViewModel : ViewModel() {
    private val _state = MutableStateFlow(createInitialState())
    val state: StateFlow<GameState> = _state.asStateFlow()

    private val _floatingParticles = MutableStateFlow<List<FloatingParticle>>(emptyList())
    val floatingParticles: StateFlow<List<FloatingParticle>> = _floatingParticles.asStateFlow()

    private var weatherTimerAccumulator = 0.0
    private var secondTickAccumulator = 0.0

    private fun createInitialState(): GameState {
        val tierInfo = getClaimTierInfo(1)
        val hiddenAt = generateNuggetDepth(tierInfo.capacityGrams)
        return GameState(
            cash = 0.0,
            remainingDirtGrams = tierInfo.capacityGrams,
            maxDirtCapacity = tierInfo.capacityGrams,
            claimTier = 1,
            basePricePerGram = 0.01,
            nuggetHiddenAtGrams = hiddenAt,
            currentHiddenNugget = generateRandomNugget(1, tierInfo.capacityGrams),
            discoveredNuggets = emptyList(),
            prestigeTokens = 0,
            currentWeather = defaultWeatherPool().first(),
            weatherSecondsRemaining = 50,
            dailyMissions = generateDailyMissions(),
            weeklyMissions = generateWeeklyMissions()
        )
    }

    fun setBuyMode(mode: BuyMode) {
        _state.update { it.copy(buyMode = mode) }
    }

    fun onManualSift(tapX: Float = 0f, tapY: Float = 0f) {
        val now = System.currentTimeMillis()
        var siftAmount = 0.0
        var cashEarned = 0.0
        var isCrit = false
        var isShatter = false

        _state.update { current ->
            if (current.remainingDirtGrams <= 0.0) return@update current

            val rhythm = current.toolsUpgrades.find { it.id == "tool_prospector_rhythm" }
            var newCombo = current.comboMultiplier
            if (rhythm != null && rhythm.level > 0) {
                val maxCombo = min(3.0, 1.0 + rhythm.level * 0.25 * rhythm.milestoneMultiplier)
                newCombo = min(maxCombo, current.comboMultiplier + 0.15)
            }

            val magPan = current.toolsUpgrades.find { it.id == "tool_magnetic_pan" }
            var tapMult = 1.0
            if (magPan != null && magPan.level > 0) {
                val critChance = min(75.0, magPan.level * 5.0 * magPan.milestoneMultiplier)
                if (Random.nextDouble() * 100.0 < critChance) {
                    tapMult = 10.0
                    isCrit = true
                }
            }

            val pickaxe = current.toolsUpgrades.find { it.id == "tool_diamond_pickaxe" }
            var shatterBonus = 0.0
            if (pickaxe != null && pickaxe.level > 0) {
                val shatterChance = min(25.0, 1.0 + (pickaxe.level - 1) * 0.5)
                if (Random.nextDouble() * 100.0 < shatterChance) {
                    shatterBonus = (500.0 * pickaxe.milestoneMultiplier) / current.effectiveHardness
                    isShatter = true
                }
            }

            val rawPower = (current.effectiveClickPower * tapMult) + shatterBonus
            siftAmount = rawPower.coerceAtMost(current.remainingDirtGrams)
            cashEarned = siftAmount * current.effectivePricePerGram
            val newRemaining = (current.remainingDirtGrams - siftAmount).coerceAtLeast(0.0)

            var pendingNugget = current.pendingNuggetDiscovery
            if (pendingNugget == null && newRemaining <= current.nuggetHiddenAtGrams) {
                pendingNugget = current.currentHiddenNugget
            }

            current.copy(
                cash = current.cash + cashEarned,
                remainingDirtGrams = newRemaining,
                totalDirtSifted = current.totalDirtSifted + siftAmount,
                totalCashEarned = current.totalCashEarned + cashEarned,
                totalManualClicks = current.totalManualClicks + 1,
                totalCrits = current.totalCrits + (if (isCrit) 1 else 0),
                totalShatters = current.totalShatters + (if (isShatter) 1 else 0),
                maxComboReached = max(current.maxComboReached, newCombo),
                todayDirtSifted = current.todayDirtSifted + siftAmount,
                todayManualClicks = current.todayManualClicks + 1,
                todayCashEarned = current.todayCashEarned + cashEarned,
                weekDirtSifted = current.weekDirtSifted + siftAmount,
                weekManualClicks = current.weekManualClicks + 1,
                weekCashEarned = current.weekCashEarned + cashEarned,
                comboMultiplier = newCombo,
                lastTapTimestamp = now,
                pendingNuggetDiscovery = pendingNugget
            )
        }

        if (siftAmount > 0.0) {
            val label = when {
                isCrit -> "CRIT 10x! +${GameFormatters.formatGrams(siftAmount)}"
                isShatter -> "SHATTER! +${GameFormatters.formatGrams(siftAmount)}"
                else -> "+${GameFormatters.formatGrams(siftAmount)}"
            }
            spawnFloatingParticle(
                text = label,
                subText = "+${GameFormatters.formatCash(cashEarned)}",
                x = tapX,
                y = tapY,
                isCrit = isCrit
            )
        }
    }

    fun onGameLoopTick(dtSeconds: Double) {
        val now = System.currentTimeMillis()

        _state.update { current ->
            var newCombo = current.comboMultiplier
            if (now - current.lastTapTimestamp > 2000L && newCombo > 1.0) {
                newCombo = max(1.0, newCombo - (dtSeconds * 0.75))
            }

            var newWeather = current.currentWeather
            var newWeatherSeconds = current.weatherSecondsRemaining
            var weatherCycled = 0

            weatherTimerAccumulator += dtSeconds
            if (weatherTimerAccumulator >= 1.0) {
                val secs = weatherTimerAccumulator.toInt()
                weatherTimerAccumulator -= secs

                if (current.weatherEnabled) {
                    newWeatherSeconds -= secs
                    if (newWeatherSeconds <= 0) {
                        val candidates = defaultWeatherPool().filter { it.type != current.currentWeather.type }
                        newWeather = candidates.random()
                        newWeatherSeconds = newWeather.durationSeconds
                        weatherCycled += 1
                    }
                }
            }

            var bonusCashFromTick = 0.0
            var newBulkTimer = current.bulkDeliverySecondsRemaining
            var flakesFound = 0
            var bulkShipped = 0

            secondTickAccumulator += dtSeconds
            if (secondTickAccumulator >= 1.0) {
                val secs = secondTickAccumulator.toInt()
                secondTickAccumulator -= secs

                val concentrator = current.marketUpgrades.find { it.id == "market_gold_concentrator" }
                if (concentrator != null && concentrator.level > 0) {
                    val flakeChance = concentrator.level * 1.5 * concentrator.milestoneMultiplier
                    if (Random.nextDouble() * 100.0 < flakeChance) {
                        val reward = (10.0 + Random.nextDouble() * 90.0) * current.claimTier
                        bonusCashFromTick += reward
                        flakesFound += 1
                        spawnFloatingParticle(
                            text = "✨ GOLD FLAKE FOUND!",
                            subText = "+${GameFormatters.formatCash(reward)}",
                            x = 0f,
                            y = -50f,
                            isFlake = true
                        )
                    }
                }

                val bulkContract = current.marketUpgrades.find { it.id == "market_bulk_contract" }
                if (bulkContract != null && bulkContract.level > 0) {
                    newBulkTimer -= secs
                    if (newBulkTimer <= 0) {
                        newBulkTimer = 30
                        val margin = bulkContract.level * 25.0 * bulkContract.milestoneMultiplier
                        val payout = (current.autoRatePerSec * 15.0 * current.effectivePricePerGram * (1.0 + margin / 100.0))
                            .coerceAtLeast(25.0 * current.claimTier)
                        bonusCashFromTick += payout
                        bulkShipped += 1
                        spawnFloatingParticle(
                            text = "🚚 BULK SHIPMENT SOLD!",
                            subText = "+${GameFormatters.formatCash(payout)} (+${margin.toInt()}%)",
                            x = 0f,
                            y = -20f,
                            isFlake = true
                        )
                    }
                }
            }

            if (current.remainingDirtGrams <= 0.0 || current.autoRatePerSec <= 0.0) {
                return@update current.copy(
                    cash = current.cash + bonusCashFromTick,
                    totalCashEarned = current.totalCashEarned + bonusCashFromTick,
                    totalFlakesFound = current.totalFlakesFound + flakesFound,
                    totalBulkDeliveries = current.totalBulkDeliveries + bulkShipped,
                    totalWeatherCycles = current.totalWeatherCycles + weatherCycled,
                    todayCashEarned = current.todayCashEarned + bonusCashFromTick,
                    weekCashEarned = current.weekCashEarned + bonusCashFromTick,
                    comboMultiplier = newCombo,
                    currentWeather = newWeather,
                    weatherSecondsRemaining = newWeatherSeconds,
                    bulkDeliverySecondsRemaining = newBulkTimer
                )
            }

            val desiredSift = current.autoRatePerSec * dtSeconds
            val actualSift = desiredSift.coerceAtMost(current.remainingDirtGrams)
            val cashFromSift = actualSift * current.effectivePricePerGram
            val newRemaining = (current.remainingDirtGrams - actualSift).coerceAtLeast(0.0)

            var pendingNugget = current.pendingNuggetDiscovery
            if (pendingNugget == null && newRemaining <= current.nuggetHiddenAtGrams) {
                pendingNugget = current.currentHiddenNugget
            }

            val totalEarned = cashFromSift + bonusCashFromTick

            current.copy(
                cash = current.cash + totalEarned,
                remainingDirtGrams = newRemaining,
                totalDirtSifted = current.totalDirtSifted + actualSift,
                totalCashEarned = current.totalCashEarned + totalEarned,
                totalFlakesFound = current.totalFlakesFound + flakesFound,
                totalBulkDeliveries = current.totalBulkDeliveries + bulkShipped,
                totalWeatherCycles = current.totalWeatherCycles + weatherCycled,
                todayDirtSifted = current.todayDirtSifted + actualSift,
                todayCashEarned = current.todayCashEarned + totalEarned,
                weekDirtSifted = current.weekDirtSifted + actualSift,
                weekCashEarned = current.weekCashEarned + totalEarned,
                comboMultiplier = newCombo,
                currentWeather = newWeather,
                weatherSecondsRemaining = newWeatherSeconds,
                bulkDeliverySecondsRemaining = newBulkTimer,
                pendingNuggetDiscovery = pendingNugget
            )
        }

        _floatingParticles.update { list ->
            list.filter { now - it.createdAt < 1200 }
        }
    }

    fun buyUpgrade(upgradeId: String) {
        _state.update { current ->
            val branch = when {
                current.toolsUpgrades.any { it.id == upgradeId } -> UpgradeBranch.TOOLS
                current.machineryUpgrades.any { it.id == upgradeId } -> UpgradeBranch.MACHINERY
                current.marketUpgrades.any { it.id == upgradeId } -> UpgradeBranch.MARKET
                current.geologyUpgrades.any { it.id == upgradeId } -> UpgradeBranch.GEOLOGY
                else -> return@update current
            }

            val targetList = when (branch) {
                UpgradeBranch.TOOLS -> current.toolsUpgrades
                UpgradeBranch.MACHINERY -> current.machineryUpgrades
                UpgradeBranch.MARKET -> current.marketUpgrades
                UpgradeBranch.GEOLOGY -> current.geologyUpgrades
            }

            val item = targetList.find { it.id == upgradeId } ?: return@update current
            val purchase = item.getBulkPurchase(current.buyMode, current.cash)
            if (!purchase.canAfford || purchase.count <= 0) return@update current

            val updatedList = targetList.map {
                if (it.id == upgradeId) it.copy(level = it.level + purchase.count) else it
            }

            val newCash = current.cash - purchase.totalCost

            when (branch) {
                UpgradeBranch.TOOLS -> current.copy(
                    cash = newCash,
                    toolsUpgrades = updatedList,
                    todayCashSpent = current.todayCashSpent + purchase.totalCost,
                    todayUpgradesBought = current.todayUpgradesBought + purchase.count,
                    weekCashSpent = current.weekCashSpent + purchase.totalCost,
                    weekUpgradesBought = current.weekUpgradesBought + purchase.count,
                    totalCashSpent = current.totalCashSpent + purchase.totalCost,
                    totalUpgradesBought = current.totalUpgradesBought + purchase.count
                )
                UpgradeBranch.MACHINERY -> current.copy(
                    cash = newCash,
                    machineryUpgrades = updatedList,
                    todayCashSpent = current.todayCashSpent + purchase.totalCost,
                    todayUpgradesBought = current.todayUpgradesBought + purchase.count,
                    weekCashSpent = current.weekCashSpent + purchase.totalCost,
                    weekUpgradesBought = current.weekUpgradesBought + purchase.count,
                    totalCashSpent = current.totalCashSpent + purchase.totalCost,
                    totalUpgradesBought = current.totalUpgradesBought + purchase.count
                )
                UpgradeBranch.MARKET -> current.copy(
                    cash = newCash,
                    marketUpgrades = updatedList,
                    todayCashSpent = current.todayCashSpent + purchase.totalCost,
                    todayUpgradesBought = current.todayUpgradesBought + purchase.count,
                    weekCashSpent = current.weekCashSpent + purchase.totalCost,
                    weekUpgradesBought = current.weekUpgradesBought + purchase.count,
                    totalCashSpent = current.totalCashSpent + purchase.totalCost,
                    totalUpgradesBought = current.totalUpgradesBought + purchase.count
                )
                UpgradeBranch.GEOLOGY -> current.copy(
                    cash = newCash,
                    geologyUpgrades = updatedList,
                    todayCashSpent = current.todayCashSpent + purchase.totalCost,
                    todayUpgradesBought = current.todayUpgradesBought + purchase.count,
                    weekCashSpent = current.weekCashSpent + purchase.totalCost,
                    weekUpgradesBought = current.weekUpgradesBought + purchase.count,
                    totalCashSpent = current.totalCashSpent + purchase.totalCost,
                    totalUpgradesBought = current.totalUpgradesBought + purchase.count
                )
            }
        }
    }

    fun claimDiscoveredNugget() {
        _state.update { current ->
            val nugget = current.pendingNuggetDiscovery ?: return@update current
            val nextTier = current.claimTier + 1
            val nextTierInfo = getClaimTierInfo(nextTier)
            val nextCapacity = nextTierInfo.capacityGrams
            val nextHiddenAt = generateNuggetDepth(nextCapacity)
            val newNugget = generateRandomNugget(nextTier, nextCapacity)

            val radar = current.geologyUpgrades.find { it.id == "geo_radar" }
            val radarStrip = if (radar != null && radar.level > 0) min(0.30, radar.level * 0.10) else 0.0
            val totalStripPct = min(0.50, current.steamShovelStripPct + radarStrip)
            val strippedGrams = nextCapacity * totalStripPct
            val startingRemaining = nextCapacity - strippedGrams

            val certificatesEarned = nugget.certificatesAwarded

            current.copy(
                claimTier = nextTier,
                cash = current.startingCashBonus,
                maxDirtCapacity = nextCapacity,
                remainingDirtGrams = startingRemaining,
                nuggetHiddenAtGrams = nextHiddenAt,
                currentHiddenNugget = newNugget,
                discoveredNuggets = current.discoveredNuggets + nugget,
                prestigeTokens = current.prestigeTokens + certificatesEarned,
                toolsUpgrades = defaultToolsUpgrades(),
                machineryUpgrades = defaultMachineryUpgrades(),
                marketUpgrades = defaultMarketUpgrades(),
                geologyUpgrades = defaultGeologyUpgrades(),
                totalDirtSifted = current.totalDirtSifted + strippedGrams,
                totalRebirths = current.totalRebirths + 1,
                highestHardnessBeaten = max(current.highestHardnessBeaten, current.effectiveHardness),
                weekNuggetsFound = current.weekNuggetsFound + 1,
                pendingNuggetDiscovery = null,
                comboMultiplier = 1.0
            )
        }
    }

    fun buyPrestigePerk(perkId: String) {
        _state.update { current ->
            val perk = current.prestigePerks.find { it.id == perkId } ?: return@update current
            if (perk.isMaxed || current.prestigeTokens < perk.currentCost) return@update current

            val updatedPerks = current.prestigePerks.map {
                if (it.id == perkId) it.copy(level = it.level + 1) else it
            }

            current.copy(
                prestigeTokens = current.prestigeTokens - perk.currentCost,
                prestigePerks = updatedPerks
            )
        }
    }

    fun claimDailyMission(missionId: String) {
        _state.update { current ->
            val mission = current.dailyMissions.find { it.id == missionId } ?: return@update current
            if (mission.isClaimed) return@update current

            val progress = current.getDailyMissionProgress(mission)
            if (progress < mission.target) return@update current

            val updatedMissions = current.dailyMissions.map {
                if (it.id == missionId) it.copy(isClaimed = true) else it
            }

            current.copy(
                cash = current.cash + mission.rewardCash,
                prestigeTokens = current.prestigeTokens + mission.rewardCertificates,
                totalMissionsClaimed = current.totalMissionsClaimed + 1,
                dailyMissions = updatedMissions
            )
        }
    }

    fun claimWeeklyMission(missionId: String) {
        _state.update { current ->
            val mission = current.weeklyMissions.find { it.id == missionId } ?: return@update current
            if (mission.isClaimed) return@update current

            val progress = current.getWeeklyMissionProgress(mission)
            if (progress < mission.target) return@update current

            val updatedMissions = current.weeklyMissions.map {
                if (it.id == missionId) it.copy(isClaimed = true) else it
            }

            current.copy(
                cash = current.cash + mission.rewardCash,
                prestigeTokens = current.prestigeTokens + mission.rewardCertificates,
                totalMissionsClaimed = current.totalMissionsClaimed + 1,
                weeklyMissions = updatedMissions
            )
        }
    }

    fun refreshDailyMissions() {
        _state.update {
            it.copy(
                dailyMissions = generateDailyMissions(),
                todayDirtSifted = 0.0,
                todayCashSpent = 0.0,
                todayUpgradesBought = 0,
                todayManualClicks = 0,
                todayCashEarned = 0.0,
                lastDailyResetTimestamp = System.currentTimeMillis()
            )
        }
    }

    fun refreshWeeklyMissions() {
        _state.update {
            it.copy(
                weeklyMissions = generateWeeklyMissions(),
                weekDirtSifted = 0.0,
                weekCashSpent = 0.0,
                weekUpgradesBought = 0,
                weekManualClicks = 0,
                weekCashEarned = 0.0,
                weekNuggetsFound = 0,
                lastWeeklyResetTimestamp = System.currentTimeMillis()
            )
        }
    }

    fun setWeatherEnabled(enabled: Boolean) {
        _state.update {
            it.copy(
                weatherEnabled = enabled,
                currentWeather = if (!enabled) defaultWeatherPool().first() else it.currentWeather
            )
        }
    }

    fun triggerRandomWeather() {
        _state.update { current ->
            val candidates = defaultWeatherPool().filter { it.type != current.currentWeather.type }
            val next = candidates.random()
            current.copy(
                currentWeather = next,
                weatherSecondsRemaining = next.durationSeconds
            )
        }
    }

    fun setBasePricePerGram(price: Double) {
        _state.update { it.copy(basePricePerGram = price.coerceIn(0.001, 10.0)) }
    }

    fun claimMilestone(chainId: String) {
        _state.update { current ->
            val chains = defaultAchievementChains()
            val chain = chains.find { it.id == chainId } ?: return@update current
            val currentClaimed = current.claimedMilestones[chainId] ?: 0
            if (currentClaimed >= chain.tiers.size) return@update current

            val targetTier = chain.tiers[currentClaimed]
            val value = chain.getValue(current)
            if (value < targetTier.threshold) return@update current

            val updatedMap = current.claimedMilestones.toMutableMap()
            updatedMap[chainId] = currentClaimed + 1

            val newCash = current.cash + targetTier.rewardCash
            val newCerts = current.prestigeTokens + targetTier.rewardCertificates

            spawnFloatingParticle(
                text = "🎖️ ${chain.title} ${targetTier.titleSuffix}!",
                subText = "+${GameFormatters.formatCash(targetTier.rewardCash)} (+0.3% Meta)",
                x = 0f,
                y = -80f,
                isGold = true
            )

            current.copy(
                cash = newCash,
                prestigeTokens = newCerts,
                claimedMilestones = updatedMap
            )
        }
    }

    fun claimAllReadyMilestones() {
        _state.update { current ->
            val chains = defaultAchievementChains()
            var bonusCash = 0.0
            var bonusCerts = 0
            val updatedMap = current.claimedMilestones.toMutableMap()
            var claimedCount = 0

            for (chain in chains) {
                var claimedLevel = updatedMap[chain.id] ?: 0
                val value = chain.getValue(current)
                while (claimedLevel < chain.tiers.size && value >= chain.tiers[claimedLevel].threshold) {
                    val tier = chain.tiers[claimedLevel]
                    bonusCash += tier.rewardCash
                    bonusCerts += tier.rewardCertificates
                    claimedLevel++
                    claimedCount++
                }
                updatedMap[chain.id] = claimedLevel
            }

            if (claimedCount == 0) return@update current

            spawnFloatingParticle(
                text = "🎖️ CLAIMED $claimedCount MILESTONES!",
                subText = "+${GameFormatters.formatCash(bonusCash)} • +${bonusCerts} Certs",
                x = 0f,
                y = -100f,
                isGold = true
            )

            current.copy(
                cash = current.cash + bonusCash,
                prestigeTokens = current.prestigeTokens + bonusCerts,
                claimedMilestones = updatedMap
            )
        }
    }

    fun claimAchievement(id: String) {
        _state.update { current ->
            val achievement = current.achievements.find { it.id == id } ?: return@update current
            if (achievement.isClaimed) return@update current

            val updated = current.achievements.map {
                if (it.id == id) it.copy(isClaimed = true) else it
            }

            current.copy(
                cash = current.cash + achievement.rewardCash,
                achievements = updated
            )
        }
    }

    fun addDebugCash(amount: Double) {
        _state.update { it.copy(cash = it.cash + amount) }
    }

    fun addDebugTokens(amount: Int) {
        _state.update { it.copy(prestigeTokens = it.prestigeTokens + amount) }
    }

    fun resetSave() {
        _state.value = createInitialState()
    }

    private fun spawnFloatingParticle(text: String, subText: String, x: Float, y: Float, isCrit: Boolean = false, isFlake: Boolean = false, isGold: Boolean = false) {
        val particle = FloatingParticle(
            id = System.currentTimeMillis() + Random.nextLong(1000),
            text = text,
            subText = subText,
            xOffset = x,
            yOffset = y,
            isCrit = isCrit,
            isFlake = isFlake,
            isGold = isGold
        )
        _floatingParticles.update { it + particle }
    }
}

// ============================================================================
// 4. THEME & COLORS: "MINER REVOLUTION" HISTORICAL PARCHMENT SYSTEM
// ============================================================================

// 1. Color Palette: Aged Parchment, Bleached Vellum, Inks & Metals
val ParchmentBase = Color(0xFFF4EBD9)         // Warm, clean antique cream parchment (Base background)
val ParchmentVellum = Color(0xFFEADBC4)       // Bleached vellum tone (Secondary panels & cards)
val ParchmentBorder = Color(0xFFC2AC8A)       // Crisp sepia hairline border (1.dp - 1.5.dp)
val BronzeBorder = Color(0xFF8E6221)          // Refined antique brass / bronze framing
val WoodBarDark = Color(0xFF2A1C12)           // Seasoned dark wood grain header bar
val WoodBarLight = Color(0xFF3E2C1F)          // Warm wood grain highlight
val BrassRivet = Color(0xFFB8860B)            // Authentic brass corner rivet accent
val InkDark = Color(0xFF3C2D1D)               // Deep printing press ink (headers, values, primary)
val InkSecondary = Color(0xFF6D5A46)          // Faded warm graphite (secondary labels, captions)

// Button Hierarchy & Accents
val ForestGreenLight = Color(0xFF2D5A27)      // Historical forest green (primary / positive actions)
val ForestGreenDark = Color(0xFF1E3F1A)       // Deep forest green shadow
val AmberGoldLight = Color(0xFFD8B678)        // Warm burnished amber gold (accent & milestone actions)
val AmberGoldDark = Color(0xFFC79541)         // Burnished gold shadow
val CrimsonWax = Color(0xFF9C2A2A)            // Controlled sealing-wax crimson (destructive & alert)
val DisabledBeige = Color(0xFFD5C7B2)         // Desaturated dry dust beige (disabled button state)
val DisabledText = Color(0xFF8C7B68)          // Dimmed non-interactive text
val VelvetMahogany = Color(0xFF1C130E)        // Ceremonial velvet mahogany for legendary plaques
val RiverAquaVintage = Color(0xFF1B6B93)      // Readable antique surveyor blueprint blue

// Compatibility Aliases for underlying references across screens
val GoldPrimary = AmberGoldDark
val GoldSecondary = AmberGoldLight
val GoldTertiary = BronzeBorder
val EarthBackground = ParchmentBase
val EarthSurface = ParchmentVellum
val EarthCard = Color(0xFFE2D3BC)
val EarthAccent = ParchmentBorder
val RiverAqua = RiverAquaVintage
val EmeraldCash = Color(0xFF225B20)
val RustOrange = Color(0xFFA0522D)
val CertificateGold = AmberGoldDark
val EarthDark = WoodBarDark

val MinerRevolutionColorPalette = lightColorScheme(
    primary = ForestGreenLight,
    secondary = AmberGoldDark,
    tertiary = BronzeBorder,
    background = ParchmentBase,
    surface = ParchmentVellum,
    surfaceVariant = Color(0xFFE2D3BC),
    onPrimary = Color.White,
    onSecondary = InkDark,
    onTertiary = Color.White,
    onBackground = InkDark,
    onSurface = InkDark,
    onSurfaceVariant = InkSecondary
)

val DarkColorPalette = MinerRevolutionColorPalette

// ============================================================================
// 4B. REUSABLE DRAW MODIFIERS & TYPOGRAPHIC HELPERS (60 FPS SCROLL PERFORMANCE)
// ============================================================================

/**
 * Renders a dual-line vintage border (outer 1.5.dp bronze, inner 0.5.dp sepia)
 * with brass corner rivets via DrawModifier for silky 60 FPS scrolling.
 */
fun Modifier.parchmentBorder(
    cornerRadiusDp: Dp = 10.dp,
    drawRivets: Boolean = true
): Modifier = this.drawBehind {
    val cr = cornerRadiusDp.toPx()
    // Outer bronze border
    drawRoundRect(
        color = BronzeBorder,
        size = size,
        cornerRadius = CornerRadius(cr, cr),
        style = Stroke(width = 1.5.dp.toPx())
    )
    // Inner sepia hairline border
    val inset = 3.dp.toPx()
    if (size.width > inset * 2 && size.height > inset * 2) {
        drawRoundRect(
            color = ParchmentBorder,
            topLeft = Offset(inset, inset),
            size = Size(size.width - inset * 2, size.height - inset * 2),
            cornerRadius = CornerRadius(cr - 2.dp.toPx(), cr - 2.dp.toPx()),
            style = Stroke(width = 0.5.dp.toPx())
        )
    }
    // Brass corner rivets
    if (drawRivets && size.width > 28.dp.toPx() && size.height > 28.dp.toPx()) {
        val r = 2.2.dp.toPx()
        val o = 5.5.dp.toPx()
        drawCircle(BrassRivet, radius = r, center = Offset(o, o))
        drawCircle(BrassRivet, radius = r, center = Offset(size.width - o, o))
        drawCircle(BrassRivet, radius = r, center = Offset(o, size.height - o))
        drawCircle(BrassRivet, radius = r, center = Offset(size.width - o, size.height - o))
    }
}

/**
 * Reusable ParchmentPanel wrapper composable featuring a dual-line vintage border
 * (outer 1.5.dp bronze, inner 0.5.dp sepia), subtle drop shadow, and a dark wood grain
 * title header bar with close ("X") button.
 */
@Composable
fun ParchmentPanel(
    title: String,
    modifier: Modifier = Modifier,
    onClose: (() -> Unit)? = null,
    headerTrailing: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        color = ParchmentVellum
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .parchmentBorder(cornerRadiusDp = 12.dp, drawRivets = true)
        ) {
            // Dark Seasoned Wood Grain Header Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.horizontalGradient(
                            listOf(WoodBarDark, WoodBarLight, WoodBarDark)
                        )
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = title.uppercase(Locale.getDefault()),
                        fontFamily = FontFamily.Serif,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = InkSecondary,
                        letterSpacing = 1.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        headerTrailing?.invoke()
                        if (onClose != null) {
                            Spacer(modifier = Modifier.width(6.dp))
                            IconButton(
                                onClick = onClose,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.Close,
                                    contentDescription = "Close",
                                    tint = AmberGoldLight,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Bleached Vellum Content Container
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp)
            ) {
                content()
            }
        }
    }
}

/**
 * Authentic curved/horizontal analog brass barometer with green (safe),
 * yellow (wear), and crimson (jammed) zones.
 */
@Composable
fun AnalogBrassBarometer(
    siltRatio: Float,
    modifier: Modifier = Modifier
) {
    val clampedRatio = siltRatio.coerceIn(0f, 1f)
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = RoundedCornerShape(10.dp),
        color = ParchmentVellum,
        border = BorderStroke(1.5.dp, BronzeBorder),
        shadowElevation = 2.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val barHeight = 10.dp.toPx()
                val barTop = size.height - barHeight - 2.dp.toPx()
                val barWidth = size.width

                // Outer brass gauge bevel
                drawRoundRect(
                    color = Color(0xFF4A3525),
                    topLeft = Offset(0f, barTop),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(5.dp.toPx(), 5.dp.toPx()),
                    style = Stroke(width = 1.dp.toPx())
                )

                // 3 Historical color zones:
                // Zone 1: Safe Green (0% - 50%)
                val w1 = barWidth * 0.50f
                drawRoundRect(
                    color = ForestGreenLight,
                    topLeft = Offset(1.dp.toPx(), barTop + 1.dp.toPx()),
                    size = Size(w1, barHeight - 2.dp.toPx()),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )
                // Zone 2: Wear Amber (50% - 80%)
                val w2 = barWidth * 0.30f
                drawRect(
                    color = AmberGoldDark,
                    topLeft = Offset(w1, barTop + 1.dp.toPx()),
                    size = Size(w2, barHeight - 2.dp.toPx())
                )
                // Zone 3: Jammed Crimson (80% - 100%)
                val w3 = barWidth * 0.20f - 2.dp.toPx()
                drawRoundRect(
                    color = CrimsonWax,
                    topLeft = Offset(w1 + w2, barTop + 1.dp.toPx()),
                    size = Size(w3, barHeight - 2.dp.toPx()),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )

                // Tick marks every 10%
                for (i in 1..9) {
                    val x = barWidth * (i / 10f)
                    drawLine(
                        color = Color.White.copy(alpha = 0.5f),
                        start = Offset(x, barTop),
                        end = Offset(x, barTop + barHeight),
                        strokeWidth = 1.dp.toPx()
                    )
                }

                // Needle pointer
                val needleX = (barWidth * clampedRatio).coerceIn(4.dp.toPx(), barWidth - 4.dp.toPx())
                drawLine(
                    color = InkDark,
                    start = Offset(needleX, barTop - 4.dp.toPx()),
                    end = Offset(needleX, barTop + barHeight + 2.dp.toPx()),
                    strokeWidth = 2.5.dp.toPx()
                )
                drawCircle(
                    color = AmberGoldLight,
                    radius = 3.5.dp.toPx(),
                    center = Offset(needleX, barTop + barHeight / 2f)
                )
                drawCircle(
                    color = InkDark,
                    radius = 1.5.dp.toPx(),
                    center = Offset(needleX, barTop + barHeight / 2f)
                )
            }

            // Top Status Labels
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopStart),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SURVEYOR'S SILT BAROMETER",
                    fontFamily = FontFamily.Serif,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = InkDark,
                    letterSpacing = 0.5.sp
                )

                val (label, color) = when {
                    clampedRatio < 0.50f -> "SAFE (${(clampedRatio * 100).toInt()}%)" to ForestGreenLight
                    clampedRatio < 0.80f -> "WEAR (${(clampedRatio * 100).toInt()}%)" to BronzeBorder
                    else -> "CRITICAL JAM (${(clampedRatio * 100).toInt()}%)" to CrimsonWax
                }

                Text(
                    text = label,
                    fontFamily = FontFamily.Serif,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    color = color
                )
            }
        }
    }
}

// ============================================================================
// 5. MAIN ACTIVITY & ENTRY POINT
// ============================================================================

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = MinerRevolutionColorPalette) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = ParchmentBase
                ) {
                    val viewModel: GoldRushViewModel = viewModel()
                    GoldRushApp(viewModel = viewModel)
                }
            }
        }
    }
}

// ============================================================================
// 6. MAIN APP CONTAINER & 5-SLOT NAVIGATION
// ============================================================================

@Composable
fun GoldRushApp(viewModel: GoldRushViewModel) {
    val state by viewModel.state.collectAsState()
    val floatingParticles by viewModel.floatingParticles.collectAsState()
    var currentScreen by remember { mutableStateOf(Screen.MINING) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(100L)
            viewModel.onGameLoopTick(0.10)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ParchmentBase)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (currentScreen) {
                    Screen.MINING -> MiningScreen(
                        state = state,
                        floatingParticles = floatingParticles,
                        onSiftTap = { x, y -> viewModel.onManualSift(x, y) },
                        onQuickBuy = { viewModel.buyUpgrade(it) },
                        onOpenAllUpgrades = { currentScreen = Screen.UPGRADES }
                    )
                    Screen.UPGRADES -> UpgradesScreen(
                        state = state,
                        buyMode = state.buyMode,
                        onSetBuyMode = { viewModel.setBuyMode(it) },
                        onBuy = { viewModel.buyUpgrade(it) },
                        onClose = { currentScreen = Screen.MINING }
                    )
                    Screen.MISSIONS -> MissionsScreen(
                        state = state,
                        onClaimDailyMission = { viewModel.claimDailyMission(it) },
                        onClaimWeeklyMission = { viewModel.claimWeeklyMission(it) },
                        onRefreshDaily = { viewModel.refreshDailyMissions() },
                        onRefreshWeekly = { viewModel.refreshWeeklyMissions() },
                        onClaimMilestone = { viewModel.claimMilestone(it) },
                        onClaimAllReadyMilestones = { viewModel.claimAllReadyMilestones() },
                        onClose = { currentScreen = Screen.MINING }
                    )
                    Screen.MUSEUM -> MuseumScreen(
                        state = state,
                        onBuyPerk = { viewModel.buyPrestigePerk(it) },
                        onClose = { currentScreen = Screen.MINING }
                    )
                    Screen.SETTINGS -> SettingsScreen(
                        state = state,
                        onPriceChange = { viewModel.setBasePricePerGram(it) },
                        onToggleWeather = { viewModel.setWeatherEnabled(it) },
                        onRerollWeather = { viewModel.triggerRandomWeather() },
                        onAddCash = { viewModel.addDebugCash(it) },
                        onAddTokens = { viewModel.addDebugTokens(it) },
                        onResetSave = { viewModel.resetSave() },
                        onClose = { currentScreen = Screen.MINING }
                    )
                }
            }

            ModernBottomNavBar(
                currentScreen = currentScreen,
                affordableCount = state.affordableUpgradesCount,
                claimableMissionsCount = state.claimableMissionsCount,
                onSelectScreen = { currentScreen = it }
            )
        }

        state.pendingNuggetDiscovery?.let { nugget ->
            NuggetRebirthDialog(
                nugget = nugget,
                currentTier = state.claimTier,
                currentTierInfo = state.claimInfo,
                nextTierInfo = getClaimTierInfo(state.claimTier + 1),
                certificatesAwarded = nugget.certificatesAwarded,
                startingCashBonus = state.startingCashBonus,
                onClaimAndRebirth = { viewModel.claimDiscoveredNugget() }
            )
        }
    }
}

// ============================================================================
// 7. BOTTOM NAVIGATION BAR: CRAFTSMAN'S FIELD KIT
// ============================================================================

@Composable
fun ModernBottomNavBar(
    currentScreen: Screen,
    affordableCount: Int,
    claimableMissionsCount: Int,
    onSelectScreen: (Screen) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = WoodBarDark,
        shadowElevation = 14.dp,
        border = BorderStroke(1.5.dp, BronzeBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            BadgedNavButton(
                icon = Icons.Rounded.Build,
                label = "Upgrades",
                isSelected = currentScreen == Screen.UPGRADES,
                badgeCount = affordableCount,
                onClick = { onSelectScreen(Screen.UPGRADES) }
            )

            BadgedNavButton(
                icon = Icons.Rounded.CheckCircle,
                label = "Contracts",
                isSelected = currentScreen == Screen.MISSIONS,
                badgeCount = claimableMissionsCount,
                badgeColor = CrimsonWax,
                onClick = { onSelectScreen(Screen.MISSIONS) }
            )

            // Center Craftsman Compass / Sifting Tool Button (48.dp minimum touch target)
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .offset(y = (-10).dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    shape = CircleShape,
                    color = if (currentScreen == Screen.MINING) AmberGoldDark else WoodBarLight,
                    border = BorderStroke(2.dp, if (currentScreen == Screen.MINING) AmberGoldLight else BronzeBorder),
                    shadowElevation = 10.dp,
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable { onSelectScreen(Screen.MINING) }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Rounded.PlayArrow,
                            contentDescription = "Mining Basin",
                            tint = if (currentScreen == Screen.MINING) InkDark else AmberGoldLight,
                            modifier = Modifier
                                .size(28.dp)
                                .rotate(-45f)
                        )
                    }
                }
            }

            BadgedNavButton(
                icon = Icons.Rounded.Star,
                label = "Museum",
                isSelected = currentScreen == Screen.MUSEUM,
                badgeCount = 0,
                onClick = { onSelectScreen(Screen.MUSEUM) }
            )

            BadgedNavButton(
                icon = Icons.Rounded.Settings,
                label = "Journal",
                isSelected = currentScreen == Screen.SETTINGS,
                badgeCount = 0,
                onClick = { onSelectScreen(Screen.SETTINGS) }
            )
        }
    }
}

@Composable
fun BadgedNavButton(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    badgeCount: Int,
    badgeColor: Color = AmberGoldDark,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .defaultMinSize(minWidth = 52.dp, minHeight = 48.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        BadgedBox(
            badge = {
                if (badgeCount > 0) {
                    Badge(
                        containerColor = badgeColor,
                        contentColor = if (badgeColor == CrimsonWax) Color.White else InkDark
                    ) {
                        Text(
                            text = if (badgeCount > 99) "99+" else badgeCount.toString(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Serif
                        )
                    }
                }
            }
        ) {
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = if (isSelected) WoodBarLight else Color.Transparent,
                border = if (isSelected) BorderStroke(1.dp, BronzeBorder) else null,
                modifier = Modifier.padding(2.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = if (isSelected) AmberGoldLight else ParchmentBorder,
                    modifier = Modifier
                        .padding(4.dp)
                        .size(20.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontFamily = FontFamily.Serif,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) AmberGoldLight else ParchmentBorder,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// ============================================================================
// 8. MINING SCREEN (ANTIQUE SURVEYOR'S DRAFTING BASIN & METRIC HUD)
// ============================================================================

@Composable
fun MiningScreen(
    state: GameState,
    floatingParticles: List<FloatingParticle>,
    onSiftTap: (Float, Float) -> Unit,
    onQuickBuy: (String) -> Unit,
    onOpenAllUpgrades: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        TopMiningHeader(state = state)

        Spacer(modifier = Modifier.height(6.dp))

        if (state.weatherEnabled) {
            WeatherBanner(weather = state.currentWeather, secondsRemaining = state.weatherSecondsRemaining)
            Spacer(modifier = Modifier.height(6.dp))
        }

        state.probeDepthRange?.let { (minGrams, maxGrams) ->
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                color = ParchmentVellum,
                border = BorderStroke(1.dp, RiverAquaVintage)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Search,
                        contentDescription = "Probe",
                        tint = RiverAquaVintage,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "GEOLOGICAL SOUNDING: Paydirt vein in bottom 25% (${GameFormatters.formatGrams(minGrams)} - ${GameFormatters.formatGrams(maxGrams)})",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.SemiBold,
                        color = RiverAquaVintage,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
        }

        // Sluice Box Drafting Basin with Interactive Particle Overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .scale(if (state.isDetectorActive) pulseScale else 1f),
            contentAlignment = Alignment.Center
        ) {
            InteractiveGoldPanSection(state = state, onTap = onSiftTap)

            floatingParticles.forEach { particle ->
                FloatingParticleView(particle = particle)
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Quick-Buy Strip Framed as Craftsman Field Requisitions
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = ParchmentVellum,
            shadowElevation = 3.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .parchmentBorder(cornerRadiusDp = 12.dp, drawRivets = false)
                    .padding(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Rounded.Build,
                            contentDescription = "Quick Buy",
                            tint = BronzeBorder,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "FIELD REQUISITIONS (${state.affordableUpgrades.size})",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.6.sp,
                            color = InkDark
                        )
                    }

                    Text(
                        text = "Equipment Tree →",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenLight,
                        modifier = Modifier
                            .clickable { onOpenAllUpgrades() }
                            .padding(4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                val affordable = state.affordableUpgrades

                if (affordable.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFE5D5BF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Continue sifting to unlock field requisitions",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Serif,
                            color = InkSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                } else {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(affordable, key = { it.id }) { item ->
                            QuickBuyCard(
                                item = item,
                                onBuy = { onQuickBuy(item.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TopMiningHeader(state: GameState) {
    val tierInfo = state.claimInfo

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = ParchmentVellum,
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .parchmentBorder(cornerRadiusDp = 12.dp, drawRivets = true)
                .padding(10.dp)
        ) {
            // Claim Deed Header at the very top
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFFDFCFB8),
                    border = BorderStroke(1.dp, BronzeBorder)
                ) {
                    Text(
                        text = "TIER #${state.claimTier}: ${tierInfo.name.uppercase(Locale.getDefault())}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = InkDark,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = WoodBarDark
                ) {
                    Text(
                        text = "HARDNESS: x${String.format(Locale.US, "%.1f", state.effectiveHardness)}",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = AmberGoldLight,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Cash Balance (amount only, no label)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = GameFormatters.formatCash(state.cash),
                    fontSize = 24.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Black,
                    color = EmeraldCash
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Calibrated Paydirt Progress Ruler
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = "REMAINING PAYDIRT RESERVE",
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = InkSecondary
                )
                Text(
                    text = "${GameFormatters.formatGrams(state.remainingDirtGrams)} / ${GameFormatters.formatGrams(state.maxDirtCapacity)}",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = InkSecondary
                )
            }

            Spacer(modifier = Modifier.height(3.dp))

            LinearProgressIndicator(
                progress = { state.progressFraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .border(0.5.dp, BronzeBorder, RoundedCornerShape(4.dp)),
                color = AmberGoldDark,
                trackColor = Color(0xFFDAC6AB)
            )
        }
    }
}

@Composable
fun StatPill(icon: ImageVector, label: String, value: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFE2D3BC),
        border = BorderStroke(1.dp, ParchmentBorder),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = BronzeBorder,
                modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Column {
                Text(
                    text = label.uppercase(Locale.getDefault()),
                    fontSize = 8.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = InkSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = value,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Black,
                    color = InkDark,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun WeatherBanner(weather: WeatherEvent, secondsRemaining: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFE6D6BF),
        border = BorderStroke(1.2.dp, AmberGoldDark)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Warning,
                    contentDescription = weather.title,
                    tint = AmberGoldDark,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Column {
                    Text(
                        text = "TELEGRAPH DISPATCH: ${weather.title.uppercase(Locale.getDefault())}",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = InkSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = weather.description,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        color = InkSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(4.dp),
                color = WoodBarDark
            ) {
                Text(
                    text = "${secondsRemaining}s",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = AmberGoldLight,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

// ============================================================================
// 9. SURVEYOR'S SLUICE DRAFTING BASIN
// ============================================================================

@Composable
fun InteractiveGoldPanSection(
    state: GameState,
    onTap: (Float, Float) -> Unit
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "panScale"
    )

    val haptic = LocalHapticFeedback.current

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .scale(scale)
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = { offset ->
                        isPressed = true
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onTap(offset.x, offset.y)
                        tryAwaitRelease()
                        isPressed = false
                    }
                )
            },
        shape = RoundedCornerShape(16.dp),
        color = ParchmentVellum,
        border = BorderStroke(
            width = if (state.isDetectorActive) 2.5.dp else 1.5.dp,
            color = if (state.isDetectorActive) AmberGoldDark else BronzeBorder
        ),
        shadowElevation = if (state.isDetectorActive) 10.dp else 4.dp
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            // Surveyor's Drafting Blueprint Window & Concentric Riffle Pan
            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val radius = size.minDimension / 2.3f

                // Subtle drafting grid lines
                val step = 24.dp.toPx()
                var gx = 0f
                while (gx < size.width) {
                    drawLine(
                        color = ParchmentBorder.copy(alpha = 0.25f),
                        start = Offset(gx, 0f),
                        end = Offset(gx, size.height),
                        strokeWidth = 0.5.dp.toPx()
                    )
                    gx += step
                }
                var gy = 0f
                while (gy < size.height) {
                    drawLine(
                        color = ParchmentBorder.copy(alpha = 0.25f),
                        start = Offset(0f, gy),
                        end = Offset(size.width, gy),
                        strokeWidth = 0.5.dp.toPx()
                    )
                    gy += step
                }

                // Outer Copper Pan Bevel
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0xFF5A4130), Color(0xFF382618)),
                        center = center,
                        radius = radius
                    ),
                    radius = radius,
                    center = center
                )

                // Riffle Grooves (Surveyor's Hydraulic Ridges)
                drawCircle(
                    color = BronzeBorder,
                    radius = radius * 0.78f,
                    center = center,
                    style = Stroke(width = 3f)
                )
                drawCircle(
                    color = Color(0xFF735338),
                    radius = radius * 0.55f,
                    center = center,
                    style = Stroke(width = 2.5f)
                )
                drawCircle(
                    color = Color(0xFF8F6746),
                    radius = radius * 0.35f,
                    center = center,
                    style = Stroke(width = 2f)
                )

                // Shimmering Golden Flecks & Heavy Pyrite Flakes
                drawCircle(color = AmberGoldLight, radius = 7f, center = center)
                drawCircle(color = AmberGoldDark, radius = 5f, center = Offset(center.x + 22f, center.y - 18f))
                drawCircle(color = AmberGoldLight, radius = 6f, center = Offset(center.x - 26f, center.y + 14f))
                drawCircle(color = Color(0xFFFFE082), radius = 4f, center = Offset(center.x + 12f, center.y + 24f))
            }

            // Interactive Badges (Combo & Detector Alerts)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                if (state.comboMultiplier > 1.05) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = CrimsonWax,
                        border = BorderStroke(1.dp, AmberGoldLight)
                    ) {
                        Text(
                            text = "WAX SEAL: COMBO x${String.format(Locale.US, "%.2f", state.comboMultiplier)}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }

                if (state.isDetectorActive) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = AmberGoldDark,
                        border = BorderStroke(1.dp, BronzeBorder)
                    ) {
                        Text(
                            text = "SOUNDING: ANOMALOUS RELIC IN LOWER LAYER!",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = InkDark,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FloatingParticleView(particle: FloatingParticle) {
    val offsetY by animateFloatAsState(
        targetValue = -90f,
        animationSpec = tween(durationMillis = 850, easing = LinearOutSlowInEasing),
        label = "particleFloat"
    )
    val alpha by animateFloatAsState(
        targetValue = 0f,
        animationSpec = tween(durationMillis = 850, easing = LinearOutSlowInEasing),
        label = "particleAlpha"
    )

    Box(
        modifier = Modifier
            .offset(x = (particle.xOffset / 10).dp, y = (particle.yOffset / 10 + offsetY).dp)
            .alpha(alpha)
    ) {
        Surface(
            shape = RoundedCornerShape(4.dp),
            color = if (particle.isCrit) CrimsonWax else WoodBarDark,
            border = BorderStroke(1.dp, AmberGoldLight)
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = particle.text,
                    fontSize = if (particle.isCrit) 13.sp else 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = if (particle.isGold) AmberGoldLight else Color.White
                )
                if (particle.subText.isNotEmpty()) {
                    Text(
                        text = particle.subText,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }
    }
}

@Composable
fun QuickBuyCard(item: UpgradeItem, onBuy: () -> Unit) {
    val cost = item.nextLevelCost
    Surface(
        modifier = Modifier
            .width(138.dp)
            .defaultMinSize(minHeight = 48.dp)
            .clickable(onClick = onBuy),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFE2D3BC),
        border = BorderStroke(1.dp, BronzeBorder),
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(6.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = getUpgradeIcon(item.id),
                    contentDescription = item.name,
                    tint = ForestGreenLight,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = item.name,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = InkDark,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Text(
                text = "Lvl ${item.level}${if (item.maxLevel != null) "/${item.maxLevel}" else ""}",
                fontSize = 9.sp,
                fontFamily = FontFamily.Serif,
                color = InkSecondary
            )

            // Primary Forest Green Action Button
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = Color.Transparent,
                border = BorderStroke(1.dp, BronzeBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            brush = Brush.verticalGradient(
                                listOf(ForestGreenLight, ForestGreenDark)
                            )
                        )
                        .padding(vertical = 3.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = GameFormatters.formatCash(cost),
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = AmberGoldLight,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

// ============================================================================
// 10. UPGRADES SCREEN & REQUISITIONS LEDGER
// ============================================================================

@Composable
fun UpgradesScreen(
    state: GameState,
    buyMode: BuyMode,
    onSetBuyMode: (BuyMode) -> Unit,
    onBuy: (String) -> Unit,
    onClose: () -> Unit
) {
    var selectedBranch by remember { mutableStateOf(UpgradeBranch.TOOLS) }

    ParchmentPanel(
        title = "REQUISITIONS & TOOL REGISTRY",
        onClose = onClose,
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp),
        headerTrailing = {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = WoodBarDark,
                border = BorderStroke(1.dp, BronzeBorder)
            ) {
                Text(
                    text = GameFormatters.formatCash(state.cash),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = AmberGoldLight,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    ) {
        // Bulk Quantity Selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "BATCH MULTIPLIER:",
                fontSize = 9.sp,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                color = InkSecondary
            )

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xFFDAC6AB))
                    .border(1.dp, ParchmentBorder, RoundedCornerShape(6.dp))
                    .padding(2.dp)
            ) {
                BuyModePill(label = "x1", isSelected = buyMode == BuyMode.X1, onClick = { onSetBuyMode(BuyMode.X1) })
                BuyModePill(label = "x10", isSelected = buyMode == BuyMode.X10, onClick = { onSetBuyMode(BuyMode.X10) })
                BuyModePill(label = "x25", isSelected = buyMode == BuyMode.X25, onClick = { onSetBuyMode(BuyMode.X25) })
                BuyModePill(label = "MAX", isSelected = buyMode == BuyMode.MAX, onClick = { onSetBuyMode(BuyMode.MAX) })
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Rates & Prices Strip (Adjusted for Hardness)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            StatPill(
                icon = Icons.Rounded.PlayArrow,
                label = "Ручной совок",
                value = "+${GameFormatters.formatGrams(state.effectiveClickPower)}"
            )
            StatPill(
                icon = Icons.Rounded.Refresh,
                label = "Автопромывка",
                value = "${GameFormatters.formatNumber(state.autoRatePerSec)} g/s"
            )
            StatPill(
                icon = Icons.Rounded.ShoppingCart,
                label = "Цена гравия",
                value = "${GameFormatters.formatCash(state.effectivePricePerGram)}/g"
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 4 Branches Tab Strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFFDAC6AB))
                .border(1.dp, BronzeBorder, RoundedCornerShape(8.dp))
                .padding(2.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            UpgradeBranch.values().forEach { branch ->
                val isSelected = selectedBranch == branch
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isSelected) WoodBarDark else Color.Transparent)
                        .clickable { selectedBranch = branch }
                        .padding(vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = when (branch) {
                            UpgradeBranch.TOOLS -> "Pans & Tools"
                            UpgradeBranch.MACHINERY -> "Machinery"
                            UpgradeBranch.ECONOMY -> "Commerce"
                            UpgradeBranch.GEOLOGY -> "Surveys"
                        },
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) AmberGoldLight else InkDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        val branchUpgrades = state.upgrades
            .filter { it.branch == selectedBranch }
            .sortedWith(compareBy { it.maxLevel != null && it.level >= it.maxLevel })

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(branchUpgrades, key = { it.id }) { item ->
                RichUpgradeCard(
                    item = item,
                    state = state,
                    buyMode = buyMode,
                    onBuy = { onBuy(item.id) }
                )
            }
        }
    }
}

@Composable
fun BuyModePill(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(if (isSelected) ForestGreenLight else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            fontSize = 9.sp,
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Bold,
            color = if (isSelected) Color.White else InkDark
        )
    }
}

@Composable
fun RichUpgradeCard(
    item: UpgradeItem,
    state: GameState,
    buyMode: BuyMode,
    onBuy: () -> Unit
) {
    val totalCost = item.calculateCostForMode(buyMode, state.cash)
    val maxAffordable = item.calculateMaxAffordableLevels(state.cash)
    val levelsToBuy = when (buyMode) {
        BuyMode.X1 -> 1
        BuyMode.X10 -> 10
        BuyMode.X25 -> 25
        BuyMode.MAX -> maxAffordable
    }
    val isMaxed = item.isMaxed
    val canAfford = state.cash >= totalCost && !isMaxed && (levelsToBuy > 0 || buyMode != BuyMode.MAX)

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFE5D5BF),
        border = BorderStroke(1.dp, BronzeBorder),
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = WoodBarDark,
                    border = BorderStroke(1.dp, BronzeBorder),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = getUpgradeIcon(item.id),
                            contentDescription = item.name,
                            tint = AmberGoldLight,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                Column {
                    Text(
                        text = item.name,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = InkSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = item.description,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        color = InkSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Current: Lvl ${item.level}${if (item.maxLevel != null) "/${item.maxLevel}" else ""}",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.SemiBold,
                        color = BronzeBorder
                    )
                }
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Action Button: Forest Green (Affordable), Dry Dust Beige (Disabled)
            Surface(
                modifier = Modifier
                    .defaultMinSize(minWidth = 76.dp, minHeight = 48.dp)
                    .clickable(enabled = canAfford, onClick = onBuy),
                shape = RoundedCornerShape(6.dp),
                color = if (canAfford) Color.Transparent else DisabledBeige,
                border = BorderStroke(1.dp, if (canAfford) BronzeBorder else ParchmentBorder)
            ) {
                Box(
                    modifier = Modifier
                        .then(
                            if (canAfford) {
                                Modifier.background(
                                    brush = Brush.verticalGradient(
                                        listOf(ForestGreenLight, ForestGreenDark)
                                    )
                                )
                            } else {
                                Modifier
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        if (isMaxed) {
                            Text(
                                text = "MAX",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = DisabledText
                            )
                        } else {
                            Text(
                                text = "+$levelsToBuy Lvl",
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = if (canAfford) AmberGoldLight else DisabledText
                            )
                            Text(
                                text = GameFormatters.formatCash(totalCost),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Black,
                                color = if (canAfford) Color.White else DisabledText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 11. CONTRACTS & MILESTONES SCREEN
// ============================================================================

@Composable
fun MissionsScreen(
    state: GameState,
    onClaimDailyMission: (String) -> Unit,
    onClaimWeeklyMission: (String) -> Unit,
    onRefreshDaily: () -> Unit,
    onRefreshWeekly: () -> Unit,
    onClaimMilestone: (String) -> Unit,
    onClaimAllReadyMilestones: () -> Unit,
    onClose: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedMilestoneCategory by remember { mutableStateOf(AchievementCategory.PROGRESS) }

    ParchmentPanel(
        title = "OFFICIAL CONTRACTS & DEEDS",
        onClose = onClose,
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
    ) {
        // Tab Navigation Strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFFDAC6AB))
                .border(1.dp, BronzeBorder, RoundedCornerShape(8.dp))
                .padding(2.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            listOf("Daily Notices", "Weekly Grants", "Tier Deeds").forEachIndexed { index, title ->
                val isSelected = selectedTab == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isSelected) WoodBarDark else Color.Transparent)
                        .clickable { selectedTab = index }
                        .padding(vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) AmberGoldLight else InkDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        when (selectedTab) {
            0 -> {
                // Daily Missions List
                val sortedDaily = state.dailyMissions.sortedWith(compareBy { it.isClaimed })
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sortedDaily, key = { it.id }) { mission ->
                        MissionDeedCard(
                            title = mission.title,
                            desc = mission.description,
                            progress = mission.progress,
                            target = mission.target,
                            reward = mission.rewardCash,
                            isCompleted = mission.isCompleted,
                            isClaimed = mission.isClaimed,
                            onClaim = { onClaimDailyMission(mission.id) }
                        )
                    }
                }
            }
            1 -> {
                // Weekly Missions List
                val sortedWeekly = state.weeklyMissions.sortedWith(compareBy { it.isClaimed })
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sortedWeekly, key = { it.id }) { mission ->
                        MissionDeedCard(
                            title = mission.title,
                            desc = mission.description,
                            progress = mission.progress,
                            target = mission.target,
                            reward = mission.rewardCash,
                            isCompleted = mission.isCompleted,
                            isClaimed = mission.isClaimed,
                            onClaim = { onClaimWeeklyMission(mission.id) }
                        )
                    }
                }
            }
            2 -> {
                // Tiered Achievements / Lifetime Milestones
                val sortedMilestones = state.milestones.sortedWith(compareBy { it.isClaimed })
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sortedMilestones, key = { it.id }) { milestone ->
                        MissionDeedCard(
                            title = milestone.title,
                            desc = milestone.description,
                            progress = milestone.currentProgress,
                            target = milestone.targetValue,
                            reward = milestone.rewardCash,
                            isCompleted = milestone.isCompleted,
                            isClaimed = milestone.isClaimed,
                            onClaim = { onClaimMilestone(milestone.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MissionDeedCard(
    title: String,
    desc: String,
    progress: Double,
    target: Double,
    reward: Double,
    isCompleted: Boolean,
    isClaimed: Boolean,
    onClaim: () -> Unit
) {
    val canClaim = isCompleted && !isClaimed
    val fraction = if (target > 0) (progress / target).toFloat().coerceIn(0f, 1f) else 1f

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFE5D5BF),
        border = BorderStroke(1.dp, BronzeBorder),
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = InkSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "+${GameFormatters.formatCash(reward)}",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = ForestGreenLight
                )
            }

            Text(
                text = desc,
                fontSize = 9.sp,
                fontFamily = FontFamily.Serif,
                color = InkSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            LinearProgressIndicator(
                progress = { fraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (isCompleted) ForestGreenLight else AmberGoldDark,
                trackColor = Color(0xFFDAC6AB)
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${GameFormatters.formatNumber(progress)} / ${GameFormatters.formatNumber(target)}",
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Serif,
                    color = InkSecondary
                )

                if (isClaimed) {
                    Text(
                        text = "ACQUITTED & FILED ✓",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = InkSecondary
                    )
                } else {
                    Surface(
                        modifier = Modifier
                            .defaultMinSize(minWidth = 72.dp, minHeight = 48.dp)
                            .clickable(enabled = canClaim, onClick = onClaim),
                        shape = RoundedCornerShape(4.dp),
                        color = if (canClaim) Color.Transparent else DisabledBeige,
                        border = BorderStroke(1.dp, if (canClaim) BronzeBorder else ParchmentBorder)
                    ) {
                        Box(
                            modifier = Modifier
                                .then(
                                    if (canClaim) {
                                        Modifier.background(
                                            brush = Brush.verticalGradient(
                                                listOf(AmberGoldLight, AmberGoldDark)
                                            )
                                        )
                                    } else Modifier
                                )
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (canClaim) "CLAIM REWARD" else "IN PROGRESS",
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = if (canClaim) InkDark else DisabledText
                            )
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 12. MUSEUM & HISTORICAL EXHIBITION
// ============================================================================

@Composable
fun MuseumScreen(
    state: GameState,
    onBuyPerk: (String) -> Unit,
    onClose: () -> Unit
) {
    var museumTab by remember { mutableIntStateOf(0) }

    ParchmentPanel(
        title = "PIONEER EXHIBITION & PATENT OFFICE",
        onClose = onClose,
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp),
        headerTrailing = {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = WoodBarDark,
                border = BorderStroke(1.dp, BronzeBorder)
            ) {
                Text(
                    text = "${state.prestigeCertificates} 📜 Deeds",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = AmberGoldLight,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFFDAC6AB))
                .border(1.dp, BronzeBorder, RoundedCornerShape(8.dp))
                .padding(2.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            listOf("Exhibition Relics", "Patent Technology").forEachIndexed { index, title ->
                val isSelected = museumTab == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isSelected) WoodBarDark else Color.Transparent)
                        .clickable { museumTab = index }
                        .padding(vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) AmberGoldLight else InkDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (museumTab == 0) {
            // Relics Showcase
            val relics = state.discoveredNuggets
            if (relics.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No museum relics unsealed yet.\nSift down through deep rock layers to uncover historical treasures.",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Serif,
                        textAlign = TextAlign.Center,
                        color = InkSecondary
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(relics, key = { it.id }) { relic ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFE5D5BF),
                            border = BorderStroke(1.2.dp, BronzeBorder)
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                ProceduralNuggetCanvas(
                                    seed = relic.id.hashCode().toLong(),
                                    modifier = Modifier.size(44.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = relic.name,
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Serif,
                                        fontWeight = FontWeight.Bold,
                                        color = InkDark
                                    )
                                    Text(
                                        text = "Mass: ${GameFormatters.formatGrams(relic.weightGrams)} • Tier #${relic.claimTierFound}",
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Serif,
                                        color = InkSecondary
                                    )
                                    Text(
                                        text = "+${(relic.multiplierBonus * 100).toInt()}% Yield Multiplier",
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Serif,
                                        fontWeight = FontWeight.Bold,
                                        color = BronzeBorder
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Patent Technology Perks
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.prestigePerks, key = { it.id }) { perk ->
                    val canAfford = state.prestigeCertificates >= perk.cost && perk.level < perk.maxLevel
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFE5D5BF),
                        border = BorderStroke(1.dp, BronzeBorder)
                    ) {
                        Row(
                            modifier = Modifier.padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = perk.name,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Serif,
                                    fontWeight = FontWeight.Bold,
                                    color = InkDark
                                )
                                Text(
                                    text = perk.description,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Serif,
                                    color = InkSecondary
                                )
                                Text(
                                    text = "Rank ${perk.level}/${perk.maxLevel}",
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Serif,
                                    color = BronzeBorder
                                )
                            }

                            Surface(
                                modifier = Modifier
                                    .defaultMinSize(minWidth = 68.dp, minHeight = 48.dp)
                                    .clickable(enabled = canAfford, onClick = { onBuyPerk(perk.id) }),
                                shape = RoundedCornerShape(4.dp),
                                color = if (canAfford) Color.Transparent else DisabledBeige,
                                border = BorderStroke(1.dp, if (canAfford) BronzeBorder else ParchmentBorder)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .then(
                                            if (canAfford) {
                                                Modifier.background(
                                                    brush = Brush.verticalGradient(
                                                        listOf(ForestGreenLight, ForestGreenDark)
                                                    )
                                                )
                                            } else Modifier
                                        )
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "${perk.cost} 📜",
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Serif,
                                        fontWeight = FontWeight.Bold,
                                        color = if (canAfford) AmberGoldLight else DisabledText
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 13. NUGGET DISCOVERY DIALOG: PARCHMENT CARD & VELVET BRASS PLAQUE
// ============================================================================

@Composable
fun NuggetRebirthDialog(
    nugget: GoldenNugget,
    currentTier: Int,
    currentTierInfo: ClaimTierInfo,
    nextTierInfo: ClaimTierInfo,
    certificatesAwarded: Int,
    startingCashBonus: Double,
    onClaimAndRebirth: () -> Unit
) {
    Dialog(onDismissRequest = { /* Must claim */ }) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = VelvetMahogany,
            border = BorderStroke(2.dp, AmberGoldDark),
            shadowElevation = 24.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        // Ornate inner frame & glowing halo accent
                        val r = size.minDimension / 2f
                        drawCircle(
                            brush = Brush.radialGradient(
                                colors = listOf(AmberGoldLight.copy(alpha = 0.20f), Color.Transparent),
                                center = center,
                                radius = r
                            ),
                            radius = r,
                            center = center
                        )
                        drawRoundRect(
                            color = BronzeBorder,
                            size = size,
                            cornerRadius = CornerRadius(16.dp.toPx(), 16.dp.toPx()),
                            style = Stroke(width = 1.dp.toPx())
                        )
                    }
                    .padding(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "HISTORICAL TREASURE UNEARTHED",
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    color = AmberGoldLight,
                    letterSpacing = 1.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(10.dp))

                ProceduralNuggetCanvas(
                    seed = nugget.id.hashCode().toLong(),
                    modifier = Modifier.size(90.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = nugget.name,
                    fontSize = 15.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "Mass: ${GameFormatters.formatGrams(nugget.weightGrams)} • Tier #$currentTier",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.SemiBold,
                    color = AmberGoldLight
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Assayer Certificate Plaque
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF281C14),
                    border = BorderStroke(1.dp, AmberGoldDark),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "+$certificatesAwarded Assayer's Certificates 📜",
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = AmberGoldLight
                        )
                        Text(
                            text = "+${(nugget.multiplierBonus * 100).toInt()}% Permanent Multiplier in Exhibition",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Serif,
                            color = Color(0xFFDAC6AB)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Claim Rebirth Deed Summary
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF241810),
                    border = BorderStroke(1.dp, BronzeBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        Text(
                            text = "CLAIM REBIRTH DEED (Advancing to Tier #${nextTierInfo.tier})",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = AmberGoldLight
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "• Target Bedrock: ${nextTierInfo.name} (${GameFormatters.formatGrams(nextTierInfo.capacityGrams)})\n" +
                                   "• Rock Hardness: x${String.format(Locale.US, "%.1f", nextTierInfo.baseHardness)} (Requires advanced hydraulics)\n" +
                                   "• Cash & basic equipment re-staked at claim boundary\n" +
                                   "• Starting Cash Allowance: +${GameFormatters.formatCash(startingCashBonus)}
" +
                                   "• All Relics & Patent Perks retained permanently",
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Serif,
                            color = Color(0xFFD7CCC8),
                            lineHeight = 13.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Dual Action Buttons: Donate to Museum vs. Sell to Assayer
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Donate to Museum (Historical Forest Green)
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .defaultMinSize(minHeight = 48.dp)
                            .clickable(onClick = onClaimAndRebirth),
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Transparent,
                        border = BorderStroke(1.2.dp, BronzeBorder)
                    ) {
                        Box(
                            modifier = Modifier
                                .background(
                                    brush = Brush.verticalGradient(
                                        listOf(ForestGreenLight, ForestGreenDark)
                                    )
                                )
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "DONATE TO MUSEUM",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = AmberGoldLight
                            )
                        }
                    }

                    // Sell to Assayer (Burnished Amber Gold)
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .defaultMinSize(minHeight = 48.dp)
                            .clickable(onClick = onClaimAndRebirth),
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Transparent,
                        border = BorderStroke(1.2.dp, BronzeBorder)
                    ) {
                        Box(
                            modifier = Modifier
                                .background(
                                    brush = Brush.verticalGradient(
                                        listOf(AmberGoldLight, AmberGoldDark)
                                    )
                                )
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "SELL TO ASSAYER",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = InkDark
                            )
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 14. SETTINGS & FIELD JOURNAL SCREEN
// ============================================================================

@Composable
fun SettingsScreen(
    state: GameState,
    onPriceChange: (Double) -> Unit,
    onToggleWeather: (Boolean) -> Unit,
    onRerollWeather: () -> Unit,
    onAddCash: (Double) -> Unit,
    onAddTokens: (Int) -> Unit,
    onResetSave: () -> Unit,
    onClose: () -> Unit
) {
    ParchmentPanel(
        title = "PIONEER JOURNAL & SYSTEM SETTINGS",
        onClose = onClose,
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Weather Simulation Toggle
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFE5D5BF),
                border = BorderStroke(1.dp, BronzeBorder)
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "METEOROLOGICAL SIMULATION",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = InkDark
                        )
                        Text(
                            text = "Dynamic weather, storms and flash floods",
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Serif,
                            color = InkSecondary
                        )
                    }

                    Switch(
                        checked = state.weatherEnabled,
                        onCheckedChange = onToggleWeather,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = AmberGoldLight,
                            checkedTrackColor = ForestGreenLight,
                            uncheckedThumbColor = DisabledBeige,
                            uncheckedTrackColor = Color(0xFFDAC6AB)
                        )
                    )
                }
            }

            // Developer / Assayer Reset Section with Controlled Sealing-Wax Crimson
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFE5D5BF),
                border = BorderStroke(1.dp, BronzeBorder)
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = "ADMINISTRATIVE REGISTER",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        color = InkDark
                    )
                    Text(
                        text = "Reset all expedition logs, records and stakes back to baseline.",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Serif,
                        color = InkSecondary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Controlled Sealing-Wax Crimson Destructive Action
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp)
                            .clickable(onClick = onResetSave),
                        shape = RoundedCornerShape(6.dp),
                        color = CrimsonWax,
                        border = BorderStroke(1.dp, BronzeBorder)
                    ) {
                        Box(
                            modifier = Modifier.padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "RESET EXPEDITION PROGRESS",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 15. PROCEDURAL NUGGET CANVAS & ICON RESOLVER
// ============================================================================

@Composable
fun ProceduralNuggetCanvas(seed: Long, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val rand = java.util.Random(seed)
        val center = Offset(size.width / 2f, size.height / 2f)
        val baseRadius = size.minDimension / 2.4f

        val path = Path()
        val numPoints = 14
        for (i in 0 until numPoints) {
            val angle = (i.toFloat() / numPoints) * 2f * Math.PI.toFloat()
            val radiusVar = baseRadius * (0.80f + rand.nextFloat() * 0.40f)
            val px = center.x + kotlin.math.cos(angle) * radiusVar
            val py = center.y + kotlin.math.sin(angle) * radiusVar
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        path.close()

        drawPath(
            path = path,
            brush = Brush.radialGradient(
                colors = listOf(AmberGoldLight, AmberGoldDark, BronzeBorder),
                center = Offset(center.x - baseRadius * 0.2f, center.y - baseRadius * 0.2f),
                radius = baseRadius * 1.3f
            )
        )
        drawPath(
            path = path,
            color = Color(0xFF6B481D),
            style = Stroke(width = 1.5.dp.toPx())
        )
    }
}

fun getUpgradeIcon(id: String): ImageVector = when (id) {
    "tool_sieve" -> Icons.Rounded.Search
    "tool_magnetic_pan" -> Icons.Rounded.Star
    "tool_prospector_rhythm" -> Icons.Rounded.PlayArrow
    "tool_diamond_pickaxe" -> Icons.Rounded.ThumbUp
    "mach_sluice_box" -> Icons.Rounded.Build
    "mach_water_monitor" -> Icons.Rounded.Place
    "mach_diesel_trommel" -> Icons.Rounded.Refresh
    "mach_electric_dredge" -> Icons.Rounded.Share
    "mach_bearing_grease" -> Icons.Rounded.Star
    "market_gravel_crusher" -> Icons.Rounded.ShoppingCart
    "market_gold_concentrator" -> Icons.Rounded.Star
    "market_bulk_contract" -> Icons.Rounded.Email
    "geo_probe" -> Icons.Rounded.Search
    "geo_pulse_detector" -> Icons.Rounded.LocationOn
    "geo_radar" -> Icons.Rounded.Info
    else -> Icons.Rounded.Build
}
